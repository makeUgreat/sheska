import { ConfigService } from '@nestjs/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InfrastructureException } from '@kernels/infrastructure';
import { OllamaHttpEmbedder } from './ollama-http.embedder';

describe('OllamaHttpEmbedder', () => {
  let client: OllamaHttpEmbedder;
  const baseUrl = 'http://localhost:11434';
  const model = 'nomic-embed-text';

  beforeEach(() => {
    const configService = {
      get: (key: string) => {
        if (key === 'OLLAMA_BASE_URL') return baseUrl;
        if (key === 'OLLAMA_MODEL') return model;
        throw new Error(`Unknown config key: ${key}`);
      },
    } as unknown as ConfigService;

    client = new OllamaHttpEmbedder(configService);
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

  it('throws InfrastructureException with UNAVAILABLE when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );

    await expect(client.embed('hello')).rejects.toThrow(
      InfrastructureException,
    );
    await expect(client.embed('hello')).rejects.toMatchObject({
      error: { kind: 'unavailable', code: 'ollama.request_failed' },
    });
  });

  it('throws InfrastructureException with INVALID_DATA when response shape is unexpected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ unexpected_field: 'oops' }),
      }),
    );

    await expect(client.embed('hello')).rejects.toThrow(
      InfrastructureException,
    );
    await expect(client.embed('hello')).rejects.toMatchObject({
      error: { kind: 'invalid_data', code: 'ollama.invalid_response' },
    });
  });

  it('throws InfrastructureException with BAD_RESPONSE when Ollama responds with an error status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );

    await expect(client.embed('hello')).rejects.toThrow(
      InfrastructureException,
    );
    await expect(client.embed('hello')).rejects.toMatchObject({
      error: { kind: 'bad_response', code: 'ollama.bad_response' },
    });
  });
});
