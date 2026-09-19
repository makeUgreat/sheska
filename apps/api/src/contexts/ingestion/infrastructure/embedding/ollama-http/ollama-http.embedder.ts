import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { type CallContext } from '@core/call-context';
import {
  INFRASTRUCTURE_ERROR_KIND,
  InfrastructureException,
  classifyInfrastructureRetry,
  parseRetryAfterMs,
  resiliencePipeline,
  type ResilienceAttempt,
} from '@kernels/infrastructure';
import type { Embedder } from '@contexts/ingestion/application/ports';
import { OLLAMA_CONFIG, type OllamaConfig } from './ollama-http.config';

const ADAPTER = 'ollama.embedder';
const OLLAMA_MODEL = 'qwen3-embedding:0.6b';

const OllamaEmbeddingsResponse = z.object({
  embedding: z.array(z.number()),
});

@Injectable()
export class OllamaHttpEmbedder implements Embedder {
  private readonly model = OLLAMA_MODEL;

  constructor(
    @Inject(OLLAMA_CONFIG)
    private readonly config: OllamaConfig,
  ) {}

  async embed(
    text: string,
    context: CallContext,
  ): Promise<{ embedding: number[]; model: string }> {
    return resiliencePipeline()
      .retry({
        maxRetries: context.maxRetries,
        baseDelayMs: 250,
        maxDelayMs: 2_000,
        classify: classifyInfrastructureRetry,
      })
      .timeout({
        deadline: context.deadline,
        attemptTimeoutMs: 60_000,
      })
      .execute((attempt) => this.embedOnce(text, attempt));
  }

  private async embedOnce(
    text: string,
    attempt: ResilienceAttempt,
  ): Promise<{ embedding: number[]; model: string }> {
    let response: Response;

    try {
      response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: text }),
        signal: attempt.signal,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new InfrastructureException({
          kind: INFRASTRUCTURE_ERROR_KIND.TIMEOUT,
          code: 'ollama.request_timeout',
          source: { boundary: 'http-client', adapter: ADAPTER },
          message: 'Ollama did not respond in time',
          details: { deadlineBound: attempt.deadlineBound },
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
