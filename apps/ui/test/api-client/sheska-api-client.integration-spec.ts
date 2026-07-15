import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { SheskaApiClient } from '@/api/client';
import { HttpClient } from '@/api/http';

const BASE_URL_FILE = '/tmp/sheska-ui-api-client-runtime/base-url';

describe('SheskaApiClient', () => {
  it('listSources 응답 계약이 실제 API와 일치한다', async () => {
    const baseUrl =
      process.env.SHESKA_API_CLIENT_INTEGRATION_BASE_URL ??
      (await readFile(BASE_URL_FILE, 'utf8')).trim();
    const client = new SheskaApiClient(new HttpClient(baseUrl));
    const externalSourceId = `ui-api-client-${randomUUID()}`;
    const content = `API client integration test content ${randomUUID()}`;

    const uploadResponse = await fetch(`${baseUrl}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ externalSourceId, content }),
    });
    expect(uploadResponse.status).toBe(201);

    const uploaded = (await uploadResponse.json()) as {
      sourceId: string;
      externalSourceId: string;
      fingerprint: string;
      syncJobId?: string;
    };
    expect(uploaded.externalSourceId).toBe(externalSourceId);

    const response = await client.listSources();

    expect(Array.isArray(response.sources)).toBe(true);
    expect(response.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: uploaded.sourceId,
          externalSourceId,
          fingerprint: uploaded.fingerprint,
          latestSyncJob: expect.objectContaining({
            syncJobId: uploaded.syncJobId,
          }),
        }),
      ]),
    );
  });

  it('getSource 응답 계약이 실제 API와 일치한다', async () => {
    const baseUrl =
      process.env.SHESKA_API_CLIENT_INTEGRATION_BASE_URL ??
      (await readFile(BASE_URL_FILE, 'utf8')).trim();
    const client = new SheskaApiClient(new HttpClient(baseUrl));
    const externalSourceId = `ui-api-client-${randomUUID()}`;
    const content = `API client integration test content ${randomUUID()}`;

    const uploadResponse = await fetch(`${baseUrl}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ externalSourceId, content }),
    });
    expect(uploadResponse.status).toBe(201);

    const uploaded = (await uploadResponse.json()) as {
      sourceId: string;
      externalSourceId: string;
      fingerprint: string;
      syncJobId?: string;
    };

    const source = await client.getSource(uploaded.sourceId);

    expect(source).toEqual(
      expect.objectContaining({
        sourceId: uploaded.sourceId,
        externalSourceId,
        content,
        fingerprint: uploaded.fingerprint,
        latestSyncJob: expect.objectContaining({
          syncJobId: uploaded.syncJobId,
        }),
      }),
    );
  });

  it('실제 API에서 없는 source 조회 시 404 에러를 전달한다', async () => {
    const baseUrl =
      process.env.SHESKA_API_CLIENT_INTEGRATION_BASE_URL ??
      (await readFile(BASE_URL_FILE, 'utf8')).trim();
    const client = new SheskaApiClient(new HttpClient(baseUrl));

    await expect(client.getSource('non-existent-source')).rejects.toThrow(
      'HTTP error: 404 Not Found',
    );
  });
});
