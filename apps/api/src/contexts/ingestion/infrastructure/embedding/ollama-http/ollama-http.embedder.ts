import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import {
  INFRASTRUCTURE_ERROR_KIND,
  InfrastructureException,
} from '@kernels/infrastructure';
import type { Embedder } from '@contexts/ingestion/application/ports';
import { parseOllamaConfig } from './ollama.config';

const ADAPTER = 'ollama.embedder';

const OllamaEmbeddingsResponse = z.object({
  embedding: z.array(z.number()),
});

@Injectable()
export class OllamaHttpEmbedder implements Embedder {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const config = parseOllamaConfig({
      OLLAMA_BASE_URL: this.configService.get('OLLAMA_BASE_URL'),
      OLLAMA_MODEL: this.configService.get('OLLAMA_MODEL'),
    });
    this.baseUrl = config.baseUrl;
    this.model = config.model;
  }

  async embed(text: string): Promise<{ embedding: number[]; model: string }> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: text }),
      });
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
        code: 'ollama.request_failed',
        source: { boundary: 'http-client', adapter: ADAPTER },
        message: 'Ollama service is unavailable',
        details: { cause: error },
      });
    }

    if (!response.ok) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE,
        code: 'ollama.bad_response',
        source: { boundary: 'http-client', adapter: ADAPTER },
        message: `Ollama returned an error response: ${response.status} ${response.statusText}`,
        details: { cause: null },
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
          cause: parsed.error,
          fields: parsed.error.issues.map((i) => i.path.join('.')),
        },
      });
    }
    return { embedding: parsed.data.embedding, model: this.model };
  }
}
