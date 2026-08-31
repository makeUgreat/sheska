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

  it('호출자가 signal을 넘기면 그 signal을 그대로 fetch에 전달한다', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await client.embed('hello', { signal: controller.signal });

    const [, options] = fetchMock.mock.calls[0] as [
      string,
      { signal: AbortSignal },
    ];
    expect(options.signal).toBe(controller.signal);
  });

  it('호출자가 넘긴 signal이 이미 abort된 상태면 그대로 fetch에 전달된다', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await client.embed('hello', { signal: controller.signal });

    const [, options] = fetchMock.mock.calls[0] as [
      string,
      { signal: AbortSignal },
    ];
    expect(options.signal.aborted).toBe(true);
  });

  it('호출자가 넘긴 signal이 EMBED_REQUEST_TIMEOUT_MS보다 긴 타임아웃이어도 어댑터 기본값에 의해 줄어들지 않는다', async () => {
    const longSignal = AbortSignal.timeout(24 * 60 * 60 * 1000);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await client.embed('hello', { signal: longSignal });

    const [, options] = fetchMock.mock.calls[0] as [
      string,
      { signal: AbortSignal },
    ];
    expect(options.signal).toBe(longSignal);
  });

  it('호출자가 signal을 넘기지 않으면 내부 타임아웃 signal만으로 fetch를 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await client.embed('hello');

    const [, options] = fetchMock.mock.calls[0] as [
      string,
      { signal: AbortSignal },
    ];
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.signal.aborted).toBe(false);
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
