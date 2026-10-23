import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthApi } from '@sheska/contract';
import {
  HttpClient,
  HttpError,
  isRetryableHttpError,
  type ResponseSchema,
} from './http';

const passthrough: ResponseSchema<unknown> = { parse: (data) => data };

function stubFailure(status: number, statusText: string, body = '') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText,
      text: () => Promise.resolve(body),
    }),
  );
}

describe('HttpClient', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient('http://localhost:3000');
    vi.resetAllMocks();
  });

  describe('get', () => {
    it('query parameter 없이 GET 요청을 보낸다', async () => {
      const response = { ok: true };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      );

      const result = await client.get('/sources', passthrough);

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/sources', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(response);
    });

    it('query parameter를 URL에 직렬화한다', async () => {
      const response = { posts: [] };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      );

      await client.get('/posts/search', passthrough, {
        q: 'garden',
        limit: '5',
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/posts/search?q=garden&limit=5',
        { headers: { 'Content-Type': 'application/json' } },
      );
    });

    it('응답 본문을 schema로 parse한 값을 돌려준다', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ count: 3, extra: true }),
        }),
      );
      const schema: ResponseSchema<{ count: number }> = {
        parse: (data) => ({ count: (data as { count: number }).count }),
      };

      const result = await client.get('/posts/count', schema);

      expect(result).toEqual({ count: 3 });
    });

    it('schema가 응답 본문을 거부하면 throw한다', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      );
      const rejection = new Error('contract mismatch');
      const schema: ResponseSchema<never> = {
        parse: () => {
          throw rejection;
        },
      };

      await expect(client.get('/posts/count', schema)).rejects.toBe(rejection);
    });

    it('응답이 ok가 아니면 throw한다', async () => {
      stubFailure(500, 'Internal Server Error');

      await expect(client.get('/sources', passthrough)).rejects.toThrow(
        'HTTP error: 500 Internal Server Error',
      );
    });

    it('실패 응답의 status를 HttpError에 담는다', async () => {
      stubFailure(404, 'Not Found');

      await expect(
        client.get('/sources/unknown', passthrough),
      ).rejects.toMatchObject({
        name: 'HttpError',
        status: 404,
      });
    });

    it('실패 응답 본문의 code를 HttpError에 담는다', async () => {
      stubFailure(
        422,
        'Unprocessable Entity',
        JSON.stringify({
          code: 'source.invalid_content',
          message: 'Invalid content',
          details: {},
        }),
      );

      await expect(client.get('/sources', passthrough)).rejects.toMatchObject({
        status: 422,
        code: 'source.invalid_content',
      });
    });

    it('본문이 JSON이 아니면 code 없이 status만 담는다', async () => {
      stubFailure(502, 'Bad Gateway', '<html>gateway</html>');

      await expect(client.get('/sources', passthrough)).rejects.toMatchObject({
        status: 502,
        code: undefined,
      });
    });
  });

  describe('isRetryableHttpError', () => {
    it('429와 5xx는 재시도 대상이다', () => {
      expect(
        isRetryableHttpError(new HttpError(429, 'Too Many Requests')),
      ).toBe(true);
      expect(
        isRetryableHttpError(new HttpError(503, 'Service Unavailable')),
      ).toBe(true);
    });

    it('429를 제외한 4xx는 재시도 대상이 아니다', () => {
      expect(isRetryableHttpError(new HttpError(404, 'Not Found'))).toBe(false);
      expect(isRetryableHttpError(new HttpError(400, 'Bad Request'))).toBe(
        false,
      );
    });

    it('네트워크 실패는 일시적일 수 있으므로 재시도 대상이다', () => {
      expect(isRetryableHttpError(new TypeError('Failed to fetch'))).toBe(true);
    });

    it('응답 본문이 계약과 맞지 않으면 재시도 대상이 아니다', () => {
      const { error } = HealthApi.live.response.safeParse({});

      expect(isRetryableHttpError(error)).toBe(false);
    });

    it('응답 본문이 JSON이 아니면 재시도 대상이 아니다', () => {
      expect(isRetryableHttpError(new SyntaxError('Unexpected token'))).toBe(
        false,
      );
    });
  });

  describe('post', () => {
    it('JSON body로 POST 요청을 보낸다', async () => {
      const response = { postId: 'post-1' };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      );

      const result = await client.post(
        '/posts',
        { sourceId: 'source-1' },
        passthrough,
      );

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 'source-1' }),
      });
      expect(result).toEqual(response);
    });
  });

  describe('patch', () => {
    it('JSON body로 PATCH 요청을 보낸다', async () => {
      const response = { resourceId: 'resource-1', status: 'active' };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      );

      const result = await client.patch(
        '/resources/resource-1',
        { status: 'active' },
        passthrough,
      );

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/resources/resource-1',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        },
      );
      expect(result).toEqual(response);
    });
  });
});
