import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import {
  INFRASTRUCTURE_ERROR_KIND,
  InfrastructureException,
} from '@kernels/infrastructure';
import type { Embedder } from '@contexts/ingestion/application/ports';
import { DEFAULT_CHUNK_SIZE } from '@contexts/ingestion/application/services/recursive-character.chunker';
import { parseOllamaConfig } from './ollama.config';

const ADAPTER = 'ollama.embedder';

// Scale the request timeout with the chunker's max chunk size, rather than a flat
// constant, so it stays correct if chunking parameters change. This replaces
// reliance on undici's implicit 5-minute default, which fires mid-request and
// looks like a server-side failure instead of a client timeout.
// 30ms/char is a deliberately generous rate for CPU-only embedding inference.
const CONSERVATIVE_MS_PER_CHAR = 30;
const EMBED_REQUEST_TIMEOUT_MS = DEFAULT_CHUNK_SIZE * CONSERVATIVE_MS_PER_CHAR;

const OllamaEmbeddingsResponse = z.object({
  embedding: z.array(z.number()),
});

@Injectable()
export class OllamaHttpEmbedder implements Embedder {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const config = parseOllamaConfig({
      EMBEDDING_BASE_URL: this.configService.get('EMBEDDING_BASE_URL'),
    });
    this.baseUrl = config.baseUrl;
    this.model = 'qwen3-embedding:0.6b';
  }

  async embed(text: string): Promise<{ embedding: number[]; model: string }> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: text }),
        signal: AbortSignal.timeout(EMBED_REQUEST_TIMEOUT_MS),
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new InfrastructureException({
          kind: INFRASTRUCTURE_ERROR_KIND.TIMEOUT,
          code: 'ollama.request_timeout',
          source: { boundary: 'http-client', adapter: ADAPTER },
          message: `Ollama did not respond within ${EMBED_REQUEST_TIMEOUT_MS}ms`,
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
        details: {},
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
