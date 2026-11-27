import { describe, expect, it, vi } from 'vitest';
import { type HttpClientType as HttpClient } from '@/shared/api';
import { listPosts } from './client';

function buildHttpClient() {
  const get = vi.fn(() => Promise.resolve({ posts: [], nextCursor: null }));

  return { http: { get } as unknown as HttpClient, get };
}

describe('listPosts', () => {
  it('프로젝트를 주면 project 쿼리로 보낸다', async () => {
    const { http, get } = buildHttpClient();

    await listPosts(http, { limit: 20, project: 'sheska' });

    expect(get).toHaveBeenCalledWith('/posts', expect.anything(), { limit: '20', project: 'sheska' });
  });

  it('프로젝트가 없으면 project 쿼리를 보내지 않는다', async () => {
    const { http, get } = buildHttpClient();

    await listPosts(http, { limit: 20 });

    expect(get).toHaveBeenCalledWith('/posts', expect.anything(), { limit: '20' });
  });
});
