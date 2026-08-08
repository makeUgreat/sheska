import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest';
import { type PostSummary } from '@/entities/post';
import {
  HttpClientProvider,
  type HttpClientType as HttpClient,
} from '@/shared/api';
import { usePostsArchive } from './use-posts-archive';

type MockHttpClientOverrides = {
  get?: ReturnType<typeof vi.fn>;
  post?: ReturnType<typeof vi.fn>;
  patch?: ReturnType<typeof vi.fn>;
};

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function buildPost(postId: string, title: string): PostSummary {
  return {
    postId,
    sourceId: `source-${postId}`,
    title,
    viewCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function buildMockHttpClient(
  overrides: MockHttpClientOverrides = {},
): HttpClient {
  return {
    get: vi.fn((path: string) => {
      if (path === '/posts/count') {
        return Promise.resolve({ count: 0 });
      }
      return Promise.resolve({ posts: [], nextCursor: null });
    }),
    post: vi.fn(),
    patch: vi.fn(),
    ...overrides,
  } as unknown as HttpClient;
}

function renderUsePostsArchive({
  client = buildMockHttpClient(),
  initialEntry = '/',
}: {
  client?: HttpClient;
  initialEntry?: string;
} = {}) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <HttpClientProvider client={client}>{children}</HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return {
    queryClient,
    ...renderHook(() => usePostsArchive(), { wrapper }),
  };
}

describe('usePostsArchive', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('limit query param을 listPosts 요청에 전달한다', async () => {
    const client = buildMockHttpClient({
      get: vi.fn((path: string) => {
        if (path === '/posts/count') {
          return Promise.resolve({ count: 0 });
        }
        return Promise.resolve({
          posts: [buildPost('1', '목록 포스트')],
          nextCursor: null,
        });
      }),
    });

    const { result } = renderUsePostsArchive({
      client,
      initialEntry: '/?limit=5',
    });

    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/posts', { limit: '5' });
      expect(result.current.posts).toHaveLength(1);
    });
  });

  it('검색어를 trim한 뒤 searchPosts 결과를 선택한다', async () => {
    const searchPost = buildPost('search-1', '검색 결과');
    const client = buildMockHttpClient({
      get: vi.fn((path: string) => {
        if (path === '/posts/count') {
          return Promise.resolve({ count: 0 });
        }
        if (path === '/posts/search') {
          return Promise.resolve({
            posts: [searchPost],
            nextCursor: null,
          });
        }
        return Promise.resolve({
          posts: [buildPost('list-1', '목록 결과')],
          nextCursor: null,
        });
      }),
    });

    const { result } = renderUsePostsArchive({
      client,
      initialEntry: '/?limit=3',
    });

    act(() => {
      result.current.setQuery('  garden  ');
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));

    await waitFor(() => {
      expect(result.current.normalizedQuery).toBe('garden');
      expect(client.get).toHaveBeenCalledWith('/posts/search', {
        q: 'garden',
        limit: '3',
      });
      expect(result.current.isSearching).toBe(true);
      expect(result.current.posts).toEqual([searchPost]);
    });
  });

  it('search query가 선택되면 fetchNextPage도 search query를 따른다', async () => {
    const searchPosts = vi
      .fn()
      .mockResolvedValueOnce({
        posts: [buildPost('search-1', '첫 검색 결과')],
        nextCursor: 'search-next',
      })
      .mockResolvedValueOnce({
        posts: [buildPost('search-2', '다음 검색 결과')],
        nextCursor: null,
      });
    const client = buildMockHttpClient({
      get: vi.fn((path: string) => {
        if (path === '/posts/count') {
          return Promise.resolve({ count: 0 });
        }
        if (path === '/posts/search') {
          return searchPosts() as Promise<unknown>;
        }
        return Promise.resolve({
          posts: [],
          nextCursor: 'list-next',
        });
      }),
    });
    const { result } = renderUsePostsArchive({
      client,
    });

    act(() => {
      result.current.setQuery('term');
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });
    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(client.get as Mock).toHaveBeenLastCalledWith('/posts/search', {
      q: 'term',
      cursor: 'search-next',
    });
  });
});
