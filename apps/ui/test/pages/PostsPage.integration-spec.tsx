import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PostSummary } from '@/entities/post';
import { PostsPage } from '@/pages/posts';
import {
  HttpClientProvider,
  type HttpClientType as HttpClient,
} from '@/shared/api';

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function buildMockHttpClient({
  listPosts = vi.fn().mockResolvedValue({ posts: [], nextCursor: null }),
  countPosts = vi.fn().mockResolvedValue({ count: 0 }),
  searchPosts = vi.fn().mockResolvedValue({ posts: [], nextCursor: null }),
}: {
  listPosts?: ReturnType<typeof vi.fn>;
  countPosts?: ReturnType<typeof vi.fn>;
  searchPosts?: ReturnType<typeof vi.fn>;
} = {}): HttpClient {
  return {
    get: vi.fn((path: string) => {
      if (path === '/posts/count') return countPosts() as Promise<unknown>;
      if (path === '/posts/search') return searchPosts() as Promise<unknown>;
      return listPosts() as Promise<unknown>;
    }),
    post: vi.fn(),
    patch: vi.fn(),
  } as unknown as HttpClient;
}

function renderPage(client: HttpClient) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={createTestQueryClient()}>
        <HttpClientProvider client={client}>
          <PostsPage />
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('PostsPage', () => {
  const scrollTo = vi.fn();

  beforeEach(() => {
    scrollTo.mockClear();
    window.scrollTo = scrollTo;
  });

  it('렌더링 즉시 post 목록을 로딩하며 loading posts를 보여준다', async () => {
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getAllByText('Loading posts...').length).toBeGreaterThan(0);
    });
  });

  it('post 목록이 없으면 No posts yet. 메시지를 보여준다', async () => {
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockResolvedValue({ posts: [], nextCursor: null }),
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
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockResolvedValue({ posts: [post], nextCursor: null }),
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
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockResolvedValue({ posts, nextCursor: null }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('첫 번째 포스트')).toBeDefined();
      expect(screen.getByText('1 views')).toBeDefined();
      expect(screen.getByText('두 번째 포스트')).toBeDefined();
      expect(screen.getByText('2 views')).toBeDefined();
    });
  });

  it('에러가 발생하면 에러 메시지를 보여준다', async () => {
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockRejectedValue(new Error('API unavailable')),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Error: API unavailable')).toBeDefined();
    });
  });

  it('렌더링 즉시 post 목록 API를 호출한다', async () => {
    const listPosts = vi
      .fn()
      .mockResolvedValue({ posts: [], nextCursor: null });
    const client = buildMockHttpClient({ listPosts });

    renderPage(client);

    await waitFor(() => {
      expect(listPosts).toHaveBeenCalledTimes(1);
    });
  });

  it('footer가 항상 렌더링되어 있다', () => {
    const client = buildMockHttpClient();

    renderPage(client);

    expect(screen.getByText('The Garden')).toBeDefined();
  });

  it('Back to top 버튼을 클릭하면 최상단으로 스크롤한다', async () => {
    const user = userEvent.setup();
    const client = buildMockHttpClient();

    renderPage(client);

    await user.click(screen.getByRole('button', { name: 'Back to top' }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
