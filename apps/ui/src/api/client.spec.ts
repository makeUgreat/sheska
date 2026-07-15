import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from './http';
import { SheskaApiClient } from './client';

describe('SheskaApiClient', () => {
  let client: SheskaApiClient;

  beforeEach(() => {
    client = new SheskaApiClient(new HttpClient('http://localhost:3000'));
    vi.resetAllMocks();
  });

  describe('listSources', () => {
    it('GET /sources를 호출하고 sources 배열을 반환한다', async () => {
      const now = '2026-01-01T00:00:00.000Z';
      const response = {
        sources: [
          {
            sourceId: 'source-1',
            externalSourceId: 'Notes/source.md',
            fingerprint: 'fingerprint-1',
            sizeBytes: 14,
            createdAt: now,
            updatedAt: now,
          },
        ],
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      );

      const result = await client.listSources();

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/sources', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(response);
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

      await expect(client.listSources()).rejects.toThrow(
        'HTTP error: 500 Internal Server Error',
      );
    });
  });

  describe('listPosts', () => {
    it('GET /posts를 호출하고 posts 배열을 반환한다', async () => {
      const now = '2026-01-01T00:00:00.000Z';
      const response = {
        posts: [
          {
            postId: 'post-1',
            sourceId: 'source-1',
            title: '테스트 포스트',
            viewCount: 3,
            createdAt: now,
            updatedAt: now,
          },
        ],
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      );

      const result = await client.listPosts();

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/posts', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(response);
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

      await expect(client.listPosts()).rejects.toThrow(
        'HTTP error: 500 Internal Server Error',
      );
    });
  });

  describe('publishPost', () => {
    it('POST /posts를 호출하고 post를 반환한다', async () => {
      const now = '2026-01-01T00:00:00.000Z';
      const response = {
        postId: 'post-1',
        sourceId: 'source-1',
        title: '테스트 포스트',
        viewCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      );

      const result = await client.publishPost({
        sourceId: 'source-1',
        title: '테스트 포스트',
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 'source-1', title: '테스트 포스트' }),
      });
      expect(result).toEqual(response);
    });

    it('응답이 ok가 아니면 throw한다', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 409,
          statusText: 'Conflict',
        }),
      );

      await expect(
        client.publishPost({ sourceId: 'source-1', title: '테스트 포스트' }),
      ).rejects.toThrow('HTTP error: 409 Conflict');
    });
  });

  describe('getSource', () => {
    it('GET /sources/:id를 호출하고 source detail을 반환한다', async () => {
      const now = '2026-01-01T00:00:00.000Z';
      const response = {
        sourceId: 'source-1',
        externalSourceId: 'Notes/source.md',
        content: '# Source note',
        fingerprint: 'fingerprint-1',
        sizeBytes: 14,
        createdAt: now,
        updatedAt: now,
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      );

      const result = await client.getSource('source-1');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/sources/source-1',
        { headers: { 'Content-Type': 'application/json' } },
      );
      expect(result).toEqual(response);
    });

    it('source가 없으면 throw한다', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        }),
      );

      await expect(client.getSource('non-existent')).rejects.toThrow(
        'HTTP error: 404 Not Found',
      );
    });
  });
});
