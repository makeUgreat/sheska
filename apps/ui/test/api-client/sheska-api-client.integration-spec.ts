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

  it('publishPost 응답 계약이 실제 API와 일치한다', async () => {
    const baseUrl =
      process.env.SHESKA_API_CLIENT_INTEGRATION_BASE_URL ??
      (await readFile(BASE_URL_FILE, 'utf8')).trim();
    const client = new SheskaApiClient(new HttpClient(baseUrl));

    const uploadResponse = await fetch(`${baseUrl}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalSourceId: `ui-api-client-${randomUUID()}`,
        content: `API client integration test content ${randomUUID()}`,
      }),
    });
    expect(uploadResponse.status).toBe(201);
    const uploaded = (await uploadResponse.json()) as { sourceId: string };

    const result = await client.publishPost({
      sourceId: uploaded.sourceId,
    });

    expect(result).toEqual(
      expect.objectContaining({
        postId: expect.any(String),
        sourceId: uploaded.sourceId,
        title: expect.any(String),
        viewCount: 0,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
  });

  it('getPost 응답 계약이 실제 API와 일치한다', async () => {
    const baseUrl =
      process.env.SHESKA_API_CLIENT_INTEGRATION_BASE_URL ??
      (await readFile(BASE_URL_FILE, 'utf8')).trim();
    const client = new SheskaApiClient(new HttpClient(baseUrl));

    const uploadResponse = await fetch(`${baseUrl}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalSourceId: `ui-api-client-${randomUUID()}`,
        content: `API client integration test content ${randomUUID()}`,
      }),
    });
    expect(uploadResponse.status).toBe(201);
    const uploaded = (await uploadResponse.json()) as { sourceId: string };

    const title = `통합 테스트 포스트 ${randomUUID()}`;
    const publishResponse = await fetch(`${baseUrl}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: uploaded.sourceId, title }),
    });
    expect(publishResponse.status).toBe(201);
    const published = (await publishResponse.json()) as { postId: string };

    const post = await client.getPost(published.postId);

    expect(post).toEqual(
      expect.objectContaining({
        postId: published.postId,
        sourceId: uploaded.sourceId,
        title,
        viewCount: expect.any(Number),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
  });

  it('실제 API에서 없는 post 조회 시 404 에러를 전달한다', async () => {
    const baseUrl =
      process.env.SHESKA_API_CLIENT_INTEGRATION_BASE_URL ??
      (await readFile(BASE_URL_FILE, 'utf8')).trim();
    const client = new SheskaApiClient(new HttpClient(baseUrl));

    await expect(client.getPost('non-existent-post')).rejects.toThrow(
      'HTTP error: 404 Not Found',
    );
  });

  it('listPosts 응답 계약이 실제 API와 일치한다', async () => {
    const baseUrl =
      process.env.SHESKA_API_CLIENT_INTEGRATION_BASE_URL ??
      (await readFile(BASE_URL_FILE, 'utf8')).trim();
    const client = new SheskaApiClient(new HttpClient(baseUrl));

    const uploadResponse = await fetch(`${baseUrl}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalSourceId: `ui-api-client-${randomUUID()}`,
        content: `API client integration test content ${randomUUID()}`,
      }),
    });
    expect(uploadResponse.status).toBe(201);
    const uploaded = (await uploadResponse.json()) as { sourceId: string };

    const publishResponse = await fetch(`${baseUrl}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: uploaded.sourceId,
        title: `통합 테스트 포스트 ${randomUUID()}`,
      }),
    });
    expect(publishResponse.status).toBe(201);
    const published = (await publishResponse.json()) as {
      postId: string;
      sourceId: string;
      title: string;
    };

    const response = await client.listPosts();

    expect(Array.isArray(response.posts)).toBe(true);
    expect(response.posts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          postId: published.postId,
          sourceId: published.sourceId,
          title: published.title,
          viewCount: expect.any(Number),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      ]),
    );
  });
});
