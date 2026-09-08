import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { type CallContext } from '@core/call-context';
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  INFRASTRUCTURE_ERROR_KIND,
  InfrastructureException,
  parseRetryAfterMs,
  withCircuitBreakerRetry,
  type CircuitBreakerPolicy,
  type RetryPolicy,
} from '@kernels/infrastructure';
import type { Embedder } from '@contexts/ingestion/application/ports';
import { DEFAULT_CHUNK_SIZE } from '@contexts/ingestion/application/services/recursive-character.chunker';
import { OLLAMA_CONFIG, type OllamaConfig } from './ollama-http.config';

const ADAPTER = 'ollama.embedder';
const OLLAMA_MODEL = 'qwen3-embedding:0.6b';
const CONSERVATIVE_MS_PER_CHAR = 30;
const DEFAULT_EMBED_REQUEST_TIMEOUT_MS =
  DEFAULT_CHUNK_SIZE * CONSERVATIVE_MS_PER_CHAR;
const OLLAMA_HTTP_EMBED_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
};
const OLLAMA_HTTP_EMBED_CIRCUIT_BREAKER_POLICY: CircuitBreakerPolicy = {
  failureRateThreshold: 0.5,
  evaluationWindowMs: 60_000,
  minimumRequestCount: 10,
  openDurationMs: 30_000,
};

const OllamaEmbeddingsResponse = z.object({
  embedding: z.array(z.number()),
});

@Injectable()
export class OllamaHttpEmbedder implements Embedder {
  private readonly model = OLLAMA_MODEL;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    @Inject(OLLAMA_CONFIG)
    private readonly config: OllamaConfig,
  ) {
    this.circuitBreaker = new CircuitBreaker({
      policy: OLLAMA_HTTP_EMBED_CIRCUIT_BREAKER_POLICY,
    });
  }

  async embed(
    text: string,
    context: CallContext,
    attemptTimeoutMs: number = DEFAULT_EMBED_REQUEST_TIMEOUT_MS,
  ): Promise<{ embedding: number[]; model: string }> {
    try {
      return await withCircuitBreakerRetry(
        (attempt) => this.embedOnce(text, attempt.signal),
        {
          breaker: this.circuitBreaker,
          deadline: context.deadline,
          attemptTimeoutMs,
          retryPolicy: OLLAMA_HTTP_EMBED_RETRY_POLICY,
        },
      );
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        throw new InfrastructureException({
          kind: INFRASTRUCTURE_ERROR_KIND.CIRCUIT_OPEN,
          code: 'ollama.circuit_open',
          source: { boundary: 'http-client', adapter: ADAPTER },
          message: 'Ollama circuit breaker is open',
          details: {},
          cause: error,
        });
      }
      throw error;
    }
  }

  private async embedOnce(
    text: string,
    signal: AbortSignal,
  ): Promise<{ embedding: number[]; model: string }> {
    let response: Response;

    try {
      response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: text }),
        signal,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new InfrastructureException({
          kind: INFRASTRUCTURE_ERROR_KIND.TIMEOUT,
          code: 'ollama.request_timeout',
          source: { boundary: 'http-client', adapter: ADAPTER },
          message: 'Ollama did not respond in time',
          details: {},
          cause: error,
        });
      }
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
        code: 'ollama.request_failed',
        source: { boundary: 'http-client', adapter: ADAPTER },
        message: 'Ollama service is unavailable',
        details: {},
        cause: error,
      });
    }

    if (!response.ok) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE,
        code: 'ollama.bad_response',
        source: { boundary: 'http-client', adapter: ADAPTER },
        message: `Ollama returned an error response: ${response.status} ${response.statusText}`,
        details: {
          statusCode: response.status,
          retryAfterMs: parseRetryAfterMs(response.headers.get('retry-after')),
        },
      });
    }

    const parsed = OllamaEmbeddingsResponse.safeParse(await response.json());
    if (!parsed.success) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.INVALID_DATA,
        code: 'ollama.invalid_response',
        source: { boundary: 'http-client', adapter: ADAPTER },
        message: 'Ollama response did not match expected shape',
        details: {
          fields: parsed.error.issues.map((i) => i.path.join('.')),
        },
        cause: parsed.error,
      });
    }
    return { embedding: parsed.data.embedding, model: this.model };
  }
}
