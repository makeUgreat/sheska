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
});
