import { ConfigService } from '@nestjs/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaEmbeddingClient } from './ollama-embedding.client';

describe('OllamaEmbeddingClient', () => {
  let client: OllamaEmbeddingClient;
  const baseUrl = 'http://localhost:11434';
  const model = 'nomic-embed-text';

  beforeEach(() => {
    const configService = {
      getOrThrow: (key: string) => {
        if (key === 'OLLAMA_BASE_URL') return baseUrl;
        if (key === 'OLLAMA_MODEL') return model;
        throw new Error(`Unknown config key: ${key}`);
      },
    } as unknown as ConfigService;

    client = new OllamaEmbeddingClient(configService);
  });

  it('returns embedding and model on success', async () => {
    const fakeEmbedding = [0.1, 0.2, 0.3];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ embedding: fakeEmbedding }),
      }),
    );

    const result = await client.embed('hello world');

    expect(result).toEqual({ embedding: fakeEmbedding, model });
    expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: 'hello world' }),
    });
  });

  it('throws when Ollama responds with an error status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );

    await expect(client.embed('hello')).rejects.toThrow(
      'Ollama request failed: 500 Internal Server Error',
    );
  });
});
