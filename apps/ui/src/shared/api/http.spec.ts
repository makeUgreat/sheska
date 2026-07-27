import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from './http';

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

      const result = await client.get('/sources');

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

      await client.get('/posts/search', { q: 'garden', limit: '5' });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/posts/search?q=garden&limit=5',
        { headers: { 'Content-Type': 'application/json' } },
      );
    });

    it('응답이 ok가 아니면 throw한다', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        }),
      );

      await expect(client.get('/sources')).rejects.toThrow(
        'HTTP error: 500 Internal Server Error',
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

      const result = await client.post('/posts', { sourceId: 'source-1' });

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
      const response = { postId: 'post-1', title: 'Updated' };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      );

      const result = await client.patch('/posts/post-1', { title: 'Updated' });

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/posts/post-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });
      expect(result).toEqual(response);
    });
  });
});
