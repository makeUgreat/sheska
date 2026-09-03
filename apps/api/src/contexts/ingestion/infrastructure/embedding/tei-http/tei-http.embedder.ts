import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import {
  INFRASTRUCTURE_ERROR_KIND,
  InfrastructureException,
} from '@kernels/infrastructure';
import type { Embedder } from '@contexts/ingestion/application/ports';
import { DEFAULT_CHUNK_SIZE } from '@contexts/ingestion/application/services/recursive-character.chunker';
import { parseTeiConfig } from './tei-http.config';

const ADAPTER = 'tei.embedder';

// Scale the default timeout with the chunker's max chunk size, rather than a flat
// constant, so it stays correct if chunking parameters change. This replaces
// reliance on undici's implicit 5-minute default, which fires mid-request and
// looks like a server-side failure instead of a client timeout.
// 30ms/char is a deliberately generous rate for CPU-only embedding inference.
const CONSERVATIVE_MS_PER_CHAR = 30;

// Default timeout used only when the caller doesn't pass its own signal. When a
// caller does pass a signal, it's trusted outright and this default doesn't
// race against it.
export const DEFAULT_EMBED_REQUEST_TIMEOUT_MS =
  DEFAULT_CHUNK_SIZE * CONSERVATIVE_MS_PER_CHAR;

const TeiEmbedResponse = z.array(z.array(z.number())).min(1);

@Injectable()
export class TeiHttpEmbedder implements Embedder {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const config = parseTeiConfig({
      EMBEDDING_BASE_URL: this.configService.get('EMBEDDING_BASE_URL'),
    });
    this.baseUrl = config.baseUrl;
    this.model = 'Qwen/Qwen3-Embedding-0.6B';
  }

  async embed(
    text: string,
    options?: { signal?: AbortSignal },
  ): Promise<{ embedding: number[]; model: string }> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: text }),
        signal:
          options?.signal ??
          AbortSignal.timeout(DEFAULT_EMBED_REQUEST_TIMEOUT_MS),
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new InfrastructureException({
          kind: INFRASTRUCTURE_ERROR_KIND.TIMEOUT,
          code: 'tei.request_timeout',
          source: { boundary: 'http-client', adapter: ADAPTER },
          message: 'TEI did not respond in time',
          details: {},
          cause: error,
        });
      }
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
        code: 'tei.request_failed',
        source: { boundary: 'http-client', adapter: ADAPTER },
        message: 'TEI service is unavailable',
        details: {},
        cause: error,
      });
    }

    if (!response.ok) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE,
        code: 'tei.bad_response',
        source: { boundary: 'http-client', adapter: ADAPTER },
        message: `TEI returned an error response: ${response.status} ${response.statusText}`,
        details: {},
      });
    }

    const parsed = TeiEmbedResponse.safeParse(await response.json());
    if (!parsed.success) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.INVALID_DATA,
        code: 'tei.invalid_response',
        source: { boundary: 'http-client', adapter: ADAPTER },
        message: 'TEI response did not match expected shape',
        details: {
          issues: parsed.error.issues.map((i) => i.path.join('.')),
        },
        cause: parsed.error,
      });
    }
    return { embedding: parsed.data[0], model: this.model };
  }
}
