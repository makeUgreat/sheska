import { ConfigService } from '@nestjs/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InfrastructureException } from '@kernels/infrastructure';
import { OllamaHttpEmbedder } from '../ollama-http.embedder';

describe('OllamaHttpEmbedder', () => {
  let client: OllamaHttpEmbedder;
  const baseUrl = 'http://localhost:11434';
  const model = 'qwen3-embedding:0.6b';

  beforeEach(() => {
    const configService = {
      get: (key: string) => {
        if (key === 'EMBEDDING_BASE_URL') return baseUrl;
        throw new Error(`Unknown config key: ${key}`);
      },
    } as unknown as ConfigService;

    client = new OllamaHttpEmbedder(configService);
  });

  it('성공 시 임베딩과 모델을 반환한다', async () => {
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
      signal: expect.any(AbortSignal) as AbortSignal,
    });
  });

  it('요청이 타임아웃되면 TIMEOUT InfrastructureException을 던진다', async () => {
    const timeoutError = Object.assign(new Error('The operation timed out'), {
      name: 'TimeoutError',
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError));

    await expect(client.embed('hello')).rejects.toMatchObject({
      kind: 'timeout',
      code: 'ollama.request_timeout',
      cause: timeoutError,
    });
  });

  it('fetch가 실패하면 UNAVAILABLE InfrastructureException을 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );

    await expect(client.embed('hello')).rejects.toThrow(
      InfrastructureException,
    );
    await expect(client.embed('hello')).rejects.toMatchObject({
      kind: 'unavailable',
      code: 'ollama.request_failed',
      cause: expect.objectContaining({
        name: expect.any(String) as string,
        message: expect.any(String) as string,
      }) as unknown,
    });
  });

  it('응답 형태가 올바르지 않으면 INVALID_DATA InfrastructureException을 던진다', async () => {
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
      kind: 'invalid_data',
      code: 'ollama.invalid_response',
    });
  });

  it('Ollama가 에러 상태로 응답하면 BAD_RESPONSE InfrastructureException을 던진다', async () => {
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
      kind: 'bad_response',
      code: 'ollama.bad_response',
    });
  });
});
