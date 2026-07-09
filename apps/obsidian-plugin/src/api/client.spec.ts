import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SheskaApiClient } from './client';

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

    it('throws when response is not ok', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        }),
      );

      await expect(client.get('/health')).rejects.toThrow(
        'Sheska API error: 401 Unauthorized',
      );
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
        }),
      );

      await expect(
        client.uploadSource({ externalSourceId: '', content: '' }),
      ).rejects.toThrow('Sheska API error: 422 Unprocessable Entity');
    });
  });
});
