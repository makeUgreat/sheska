import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeDeadline } from '@core/deadline';
import { type CallContext } from '@core/call-context';
import { InfrastructureException } from '@kernels/infrastructure';
import { OllamaHttpEmbedder } from '../ollama-http.embedder';

function buildContext(remainingMs = 60_000): CallContext {
  return { deadline: computeDeadline(remainingMs) };
}

describe('OllamaHttpEmbedder', () => {
  let client: OllamaHttpEmbedder;
  const baseUrl = 'http://localhost:11434';
  const model = 'qwen3-embedding:0.6b';

  beforeEach(() => {
    client = new OllamaHttpEmbedder({ baseUrl });
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

    const result = await client.embed('hello world', buildContext());

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

    await expect(client.embed('hello', buildContext())).rejects.toMatchObject({
      kind: 'timeout',
      code: 'ollama.request_timeout',
      cause: timeoutError,
    });
  });

  it('fetch가 계속 실패하면 재시도가 소진된 뒤 UNAVAILABLE InfrastructureException을 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );

    await expect(client.embed('hello', buildContext())).rejects.toThrow(
      InfrastructureException,
    );
    await expect(client.embed('hello', buildContext())).rejects.toMatchObject({
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

    await expect(client.embed('hello', buildContext())).rejects.toThrow(
      InfrastructureException,
    );
    await expect(client.embed('hello', buildContext())).rejects.toMatchObject({
      kind: 'invalid_data',
      code: 'ollama.invalid_response',
    });
  });

  it('호출자가 attemptTimeoutMs를 넘기면 그 값으로 attempt별 signal의 timeout이 bound된다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

    await client.embed('hello', buildContext(), 5_000);

    expect(timeoutSpy).toHaveBeenCalledWith(5_000);
    timeoutSpy.mockRestore();
  });

  it('attemptTimeoutMs를 넘기지 않으면 DEFAULT_EMBED_REQUEST_TIMEOUT_MS를 사용한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await client.embed('hello', buildContext());

    const [, options] = fetchMock.mock.calls[0] as [
      string,
      { signal: AbortSignal },
    ];
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.signal.aborted).toBe(false);
  });

  it('Ollama가 재시도 가능한 5xx로 한 번 실패한 뒤 성공하면 재시도해서 결과를 반환한다', async () => {
    const fakeEmbedding = [0.1, 0.2, 0.3];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Busy',
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ embedding: fakeEmbedding }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await client.embed('hello', buildContext());

    expect(result).toEqual({ embedding: fakeEmbedding, model });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('Ollama가 계속 5xx를 반환하면 maxRetries만큼 재시도한 뒤 BAD_RESPONSE를 던진다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers(),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(client.embed('hello', buildContext())).rejects.toMatchObject({
      kind: 'bad_response',
      code: 'ollama.bad_response',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('Ollama가 재시도 불가능한 4xx를 반환하면 재시도하지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers(),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(client.embed('hello', buildContext())).rejects.toMatchObject({
      kind: 'bad_response',
      code: 'ollama.bad_response',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('Ollama가 에러 상태로 응답하면 BAD_RESPONSE InfrastructureException의 details에 statusCode를 담는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      }),
    );

    await expect(client.embed('hello', buildContext())).rejects.toMatchObject({
      kind: 'bad_response',
      code: 'ollama.bad_response',
      details: { statusCode: 404 },
    });
  });

  it('재시도가 모두 소진되어 breaker의 실패율 threshold를 넘으면 이후 호출은 fetch를 호출하지 않고 CIRCUIT_OPEN InfrastructureException을 던진다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers(),
    });
    vi.stubGlobal('fetch', fetchMock);

    // Production policy requires minimumRequestCount: 10 failing logical
    // calls (each already retry-exhausted, 3 fetch attempts apiece) before
    // the breaker trips at failureRateThreshold: 0.5.
    for (let i = 0; i < 10; i++) {
      await expect(client.embed('hello', buildContext())).rejects.toMatchObject(
        { kind: 'bad_response' },
      );
    }
    fetchMock.mockClear();

    await expect(client.embed('hello', buildContext())).rejects.toMatchObject({
      kind: 'circuit_open',
      code: 'ollama.circuit_open',
      cause: expect.any(Error) as Error,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  }, 20_000);
});
