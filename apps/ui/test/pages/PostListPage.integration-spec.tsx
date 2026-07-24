import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '@/api/client-context';
import { type PostSummary, type SheskaApiClient } from '@/api/client';
import { PostListPage } from '@/pages/PostListPage';

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function buildMockClient(
  overrides: Partial<SheskaApiClient> = {},
): SheskaApiClient {
  return {
    listSources: vi.fn(),
    getSource: vi.fn(),
    listPosts: vi.fn().mockResolvedValue({ posts: [] }),
    get: vi.fn(),
    ...overrides,
  } as unknown as SheskaApiClient;
}

function renderPage(client: SheskaApiClient) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={createTestQueryClient()}>
        <ApiClientProvider client={client}>
          <PostListPage />
        </ApiClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('PostListPage', () => {
  it('로딩 중에 Loading... 텍스트를 보여준다', () => {
    const client = buildMockClient({
      listPosts: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(client);

    expect(screen.getByRole('heading', { name: 'Posts' })).toBeDefined();
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('post 목록이 없으면 No posts yet. 메시지를 보여준다', async () => {
    const client = buildMockClient({
      listPosts: vi.fn().mockResolvedValue({ posts: [] }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('No posts yet.')).toBeDefined();
    });
  });

  it('post 목록을 렌더링한다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const post: PostSummary = {
      postId: 'post-1',
      sourceId: 'source-1',
      title: '테스트 포스트',
      viewCount: 5,
      createdAt: now,
      updatedAt: now,
    };
    const client = buildMockClient({
      listPosts: vi.fn().mockResolvedValue({ posts: [post] }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('테스트 포스트')).toBeDefined();
      expect(screen.getByText('5 views')).toBeDefined();
    });
  });

  it('여러 post를 모두 렌더링한다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const posts: PostSummary[] = [
      {
        postId: 'post-1',
        sourceId: 'source-1',
        title: '첫 번째 포스트',
        viewCount: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        postId: 'post-2',
        sourceId: 'source-2',
        title: '두 번째 포스트',
        viewCount: 2,
        createdAt: now,
        updatedAt: now,
      },
    ];
    const client = buildMockClient({
      listPosts: vi.fn().mockResolvedValue({ posts }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('첫 번째 포스트')).toBeDefined();
      expect(screen.getByText('1 views')).toBeDefined();
      expect(screen.getByText('두 번째 포스트')).toBeDefined();
      expect(screen.getByText('2 views')).toBeDefined();
    });
  });

  it('scroll to explore 인디케이터에 bounce 애니메이션이 적용되어 있다', () => {
    const client = buildMockClient({
      listPosts: vi.fn().mockResolvedValue({ posts: [] }),
    });

    renderPage(client);

    const indicator = screen.getByText('Scroll to explore').closest('a');
    expect(indicator?.className).toContain('animate-bounce');
  });

  it('에러가 발생하면 에러 메시지를 보여준다', async () => {
    const client = buildMockClient({
      listPosts: vi.fn().mockRejectedValue(new Error('API unavailable')),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Error: API unavailable')).toBeDefined();
    });
  });
});
