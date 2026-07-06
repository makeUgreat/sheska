import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmbeddingClient } from '../embedding.port';

@Injectable()
export class OllamaEmbeddingClient implements EmbeddingClient {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>('OLLAMA_BASE_URL');
    this.model = this.configService.getOrThrow<string>('OLLAMA_MODEL');
  }

  async embed(text: string): Promise<{ embedding: number[]; model: string }> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as { embedding: number[] };
    return { embedding: data.embedding, model: this.model };
  }
}
