import { z } from 'zod';
import { type CallContext } from '@core/call-context';
import {
  INFRASTRUCTURE_ERROR_KIND,
  InfrastructureException,
  parseRetryAfterMs,
  withRetry,
  type RetryPolicy,
} from '@kernels/infrastructure';
import type { Embedder } from '@contexts/ingestion/application/ports';
import { DEFAULT_CHUNK_SIZE } from '@contexts/ingestion/application/services/recursive-character.chunker';

const ADAPTER = 'ollama.embedder';

// Scale the default timeout with the chunker's max chunk size, rather than a flat
// constant, so it stays correct if chunking parameters change. This replaces
// reliance on undici's implicit 5-minute default, which fires mid-request and
// looks like a server-side failure instead of a client timeout.
// 30ms/char is a deliberately generous rate for CPU-only embedding inference.
const CONSERVATIVE_MS_PER_CHAR = 30;

// Default per-attempt timeout used when the caller doesn't pass its own
// attemptTimeoutMs.
const DEFAULT_EMBED_REQUEST_TIMEOUT_MS =
  DEFAULT_CHUNK_SIZE * CONSERVATIVE_MS_PER_CHAR;

// Read-only external call, per retry.md's table. baseDelayMs/maxDelayMs are an
// illustrative starting point (retry.md: tune from observed data, don't fix).
const OLLAMA_HTTP_EMBED_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
};

const OllamaEmbeddingsResponse = z.object({
  embedding: z.array(z.number()),
});

export interface OllamaHttpEmbedderOptions {
  baseUrl: string;
  model: string;
}

export class OllamaHttpEmbedder implements Embedder {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(options: OllamaHttpEmbedderOptions) {
    this.baseUrl = options.baseUrl;
    this.model = options.model;
  }

  embed(
    text: string,
    context: CallContext,
    attemptTimeoutMs: number = DEFAULT_EMBED_REQUEST_TIMEOUT_MS,
  ): Promise<{ embedding: number[]; model: string }> {
    return withRetry((attempt) => this.embedOnce(text, attempt.signal), {
      deadline: context.deadline,
      attemptTimeoutMs,
      policy: OLLAMA_HTTP_EMBED_RETRY_POLICY,
    });
  }

  private async embedOnce(
    text: string,
    signal: AbortSignal,
  ): Promise<{ embedding: number[]; model: string }> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/api/embeddings`, {
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
