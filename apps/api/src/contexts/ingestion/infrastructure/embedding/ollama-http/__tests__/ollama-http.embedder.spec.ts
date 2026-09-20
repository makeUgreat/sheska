import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvalidDataError, UnavailableError } from '@core/errors';
import { computeDeadline } from '@core/deadline';
import { type CallContext } from '@core/call-context';
import { OllamaHttpEmbedder } from '../ollama-http.embedder';

function buildContext(remainingMs = 60_000, maxRetries = 2): CallContext {
  return {
    deadline: computeDeadline(remainingMs),
    maxRetries,
  };
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

  it('요청이 타임아웃되면 TimeoutError를 던진다', async () => {
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

  it('fetch가 계속 실패하면 재시도가 소진된 뒤 UnavailableError를 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );

    await expect(client.embed('hello', buildContext())).rejects.toThrow(
      UnavailableError,
    );
    await expect(client.embed('hello', buildContext())).rejects.toMatchObject({
      code: 'ollama.request_failed',
      cause: expect.objectContaining({
        name: expect.any(String) as string,
        message: expect.any(String) as string,
      }) as unknown,
    });
  });

  it('응답 형태가 올바르지 않으면 InvalidDataError를 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ unexpected_field: 'oops' }),
      }),
    );

    await expect(client.embed('hello', buildContext())).rejects.toThrow(
      InvalidDataError,
    );
    await expect(client.embed('hello', buildContext())).rejects.toMatchObject({
      code: 'ollama.invalid_response',
    });
  });

  it('호출자가 넘긴 maxRetries만큼만 재시도한다', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new Error('connection refused'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      client.embed('hello', buildContext(60_000, 2)),
    ).rejects.toMatchObject({ kind: 'unavailable' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('호출자가 maxRetries를 0으로 넘기면 재시도하지 않는다', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new Error('connection refused'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      client.embed('hello', buildContext(60_000, 0)),
    ).rejects.toMatchObject({ kind: 'unavailable' });

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('deadline에 여유가 있으면 어댑터 자신의 attempt timeout으로 signal을 bound한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

    await client.embed('hello', buildContext(120_000));

    expect(timeoutSpy).toHaveBeenCalledWith(60_000);
    timeoutSpy.mockRestore();
  });

  it('남은 deadline이 더 짧으면 그 값으로 signal이 bound된다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: [0.1] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');

    await client.embed('hello', buildContext(1_000));

    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Number));
    expect(timeoutSpy.mock.calls[0]?.[0]).toBeLessThanOrEqual(1_000);
    timeoutSpy.mockRestore();
  });

  it('호출자 deadline이 attempt timeout보다 짧으면 timeout 에러에 deadlineBound를 남긴다', async () => {
    const fetchMock = vi.fn(() => {
      const error = new Error('aborted');
      error.name = 'TimeoutError';
      return Promise.reject(error);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      client.embed('hello', buildContext(1_000, 0)),
    ).rejects.toMatchObject({
      kind: 'timeout',
      details: { deadlineBound: true },
    });
  });

  it('deadline에 여유가 있으면 timeout 에러의 deadlineBound가 false다', async () => {
    const fetchMock = vi.fn(() => {
      const error = new Error('aborted');
      error.name = 'TimeoutError';
      return Promise.reject(error);
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      client.embed('hello', buildContext(120_000, 0)),
    ).rejects.toMatchObject({
      kind: 'timeout',
      details: { deadlineBound: false },
    });
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

  it('Ollama가 계속 5xx를 반환하면 maxRetries만큼 재시도한 뒤 BadResponseError를 던진다', async () => {
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

  it('Ollama가 에러 상태로 응답하면 BadResponseError의 details에 statusCode를 담는다', async () => {
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
});
