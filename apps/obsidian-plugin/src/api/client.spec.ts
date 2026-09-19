import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isRetryableApiError, SheskaApiClient, SheskaApiError } from './client';

describe('SheskaApiClient', () => {
  let client: SheskaApiClient;

  beforeEach(() => {
    client = new SheskaApiClient('http://localhost:3000');
    vi.resetAllMocks();
  });

  describe('get', () => {
    it('fetches the correct URL with JSON headers', async () => {
      const mockData = { status: 'ok' };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockData),
        }),
      );

      const result = await client.get('/health');

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/health', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockData);
    });

    it('throws with status when response body is empty', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: () => Promise.resolve(''),
        }),
      );

      await expect(client.get('/health')).rejects.toThrow(
        'Sheska API error: 401 Unauthorized',
      );
    });

    it('throws with body when response includes error details', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: () => Promise.resolve('invalid token'),
        }),
      );

      await expect(client.get('/health')).rejects.toThrow(
        'Sheska API error: 401 Unauthorized — invalid token',
      );
    });
  });

  describe('error shape', () => {
    it('carries the response status on the thrown error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: () => Promise.resolve(''),
        }),
      );

      await expect(client.get('/health')).rejects.toMatchObject({
        name: 'SheskaApiError',
        status: 503,
      });
    });

    it('carries the failure code when the body is an API error response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          text: () =>
            Promise.resolve(
              JSON.stringify({
                statusCode: 422,
                code: 'source.invalid_content',
                message: 'Invalid content',
                details: {},
              }),
            ),
        }),
      );

      await expect(client.get('/sources')).rejects.toMatchObject({
        status: 422,
        code: 'source.invalid_content',
      });
    });

    it('leaves the code undefined when the body is not JSON', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
          text: () => Promise.resolve('<html>gateway</html>'),
        }),
      );

      await expect(client.get('/sources')).rejects.toMatchObject({
        status: 502,
        code: undefined,
      });
    });
  });

  describe('isRetryableApiError', () => {
    it('treats 429 and 5xx as retryable', () => {
      expect(
        isRetryableApiError(new SheskaApiError(429, 'Too Many Requests', '')),
      ).toBe(true);
      expect(
        isRetryableApiError(new SheskaApiError(503, 'Service Unavailable', '')),
      ).toBe(true);
    });

    it('treats 4xx other than 429 as non-retryable', () => {
      expect(
        isRetryableApiError(
          new SheskaApiError(422, 'Unprocessable Entity', ''),
        ),
      ).toBe(false);
      expect(
        isRetryableApiError(new SheskaApiError(401, 'Unauthorized', '')),
      ).toBe(false);
    });

    it('treats a failure without a status as retryable', () => {
      expect(isRetryableApiError(new TypeError('Failed to fetch'))).toBe(true);
    });
  });

  describe('post', () => {
    it('sends JSON body with correct method and headers', async () => {
      const payload = { title: 'hello' };
      const mockData = { id: '1' };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockData),
        }),
      );

      const result = await client.post('/sources', payload);

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/sources', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockData);
    });

    it('throws when response is not ok', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          text: () => Promise.resolve(''),
        }),
      );

      await expect(client.post('/sources', {})).rejects.toThrow(
        'Sheska API error: 422 Unprocessable Entity',
      );
    });
  });

  // Contract tests — shapes mirror the API DTOs in apps/api
  describe('health', () => {
    it('calls GET /readyz and returns { status }', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ status: 'ok' }),
        }),
      );

      const result = await client.health();

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/readyz', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('uploadSource', () => {
    it('calls POST /sources with externalSourceId and content', async () => {
      const response = {
        sourceId: 'src-1',
        externalSourceId: 'vault/note.md',
        fingerprint: 'abc123',
        syncJobId: 'job-1',
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      );

      const result = await client.uploadSource({
        externalSourceId: 'vault/note.md',
        content: '# Hello',
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/sources', {
        method: 'POST',
        body: JSON.stringify({
          externalSourceId: 'vault/note.md',
          content: '# Hello',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(response);
    });

    it('syncJobId is optional in the response', async () => {
      const response = {
        sourceId: 'src-2',
        externalSourceId: 'vault/note.md',
        fingerprint: 'def456',
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      );

      const result = await client.uploadSource({
        externalSourceId: 'vault/note.md',
        content: '# Hello',
      });

      expect(result.syncJobId).toBeUndefined();
    });

    it('throws on 422 when request body is invalid', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 422,
          statusText: 'Unprocessable Entity',
          text: () => Promise.resolve(''),
        }),
      );

      await expect(
        client.uploadSource({ externalSourceId: '', content: '' }),
      ).rejects.toThrow('Sheska API error: 422 Unprocessable Entity');
    });
  });

  describe('getSyncJob', () => {
    it('calls GET /sync-jobs/:id', async () => {
      const response = {
        syncJobId: 'job/1',
        sourceId: 'source-1',
        fingerprint: 'abc123',
        status: 'completed',
        totalChunks: 2,
        processedChunks: 2,
        createdAt: '2026-09-09T00:00:00.000Z',
      };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(response),
        }),
      );

      await expect(client.getSyncJob('job/1')).resolves.toEqual(response);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/sync-jobs/job%2F1',
        { headers: { 'Content-Type': 'application/json' } },
      );
    });
  });
});
