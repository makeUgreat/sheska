import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ApiClientProvider } from '@/api/client-context';
import { type PostSummary, type SheskaApiClient } from '@/api/client';
import { usePostsArchive } from '@/hooks/use-posts-archive';

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

function buildMockClient(
  overrides: Partial<SheskaApiClient> = {},
): SheskaApiClient {
  return {
    listSources: vi.fn(),
    getSource: vi.fn(),
    listPosts: vi.fn().mockResolvedValue({ posts: [], nextCursor: null }),
    countPosts: vi.fn().mockResolvedValue({ count: 0 }),
    searchPosts: vi.fn().mockResolvedValue({ posts: [], nextCursor: null }),
    get: vi.fn(),
    ...overrides,
  } as unknown as SheskaApiClient;
}

function renderUsePostsArchive({
  client = buildMockClient(),
  initialEntry = '/',
  shouldLoadPosts,
}: {
  client?: SheskaApiClient;
  initialEntry?: string;
  shouldLoadPosts: boolean;
}) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={client}>{children}</ApiClientProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return {
    queryClient,
    ...renderHook(() => usePostsArchive(shouldLoadPosts), { wrapper }),
  };
}

describe('usePostsArchive', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shouldLoadPosts가 false면 count만 조회하고 post 목록은 조회하지 않는다', async () => {
    const client = buildMockClient();

    renderUsePostsArchive({ client, shouldLoadPosts: false });

    await waitFor(() => {
      expect(client.countPosts).toHaveBeenCalledTimes(1);
    });
    expect(client.listPosts).not.toHaveBeenCalled();
    expect(client.searchPosts).not.toHaveBeenCalled();
  });

  it('limit query param을 listPosts 요청에 전달한다', async () => {
    const client = buildMockClient({
      listPosts: vi.fn().mockResolvedValue({
        posts: [buildPost('1', '목록 포스트')],
        nextCursor: null,
      }),
    });

    const { result } = renderUsePostsArchive({
      client,
      initialEntry: '/?limit=5',
      shouldLoadPosts: true,
    });

    await waitFor(() => {
      expect(client.listPosts).toHaveBeenCalledWith({
        cursor: undefined,
        limit: 5,
      });
      expect(result.current.posts).toHaveLength(1);
    });
  });

  it('검색어를 trim한 뒤 searchPosts 결과를 선택한다', async () => {
    const searchPost = buildPost('search-1', '검색 결과');
    const client = buildMockClient({
      listPosts: vi.fn().mockResolvedValue({
        posts: [buildPost('list-1', '목록 결과')],
        nextCursor: null,
      }),
      searchPosts: vi.fn().mockResolvedValue({
        posts: [searchPost],
        nextCursor: null,
      }),
    });

    const { result } = renderUsePostsArchive({
      client,
      initialEntry: '/?limit=3',
      shouldLoadPosts: true,
    });

    act(() => {
      result.current.setQuery('  garden  ');
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));

    await waitFor(() => {
      expect(result.current.normalizedQuery).toBe('garden');
      expect(client.searchPosts).toHaveBeenCalledWith({
        query: 'garden',
        cursor: undefined,
        limit: 3,
      });
      expect(result.current.isSearching).toBe(true);
      expect(result.current.posts).toEqual([searchPost]);
    });
  });

  it('resetPostsCache는 infinite와 search post query cache를 제거한다', () => {
    const { queryClient, result } = renderUsePostsArchive({
      shouldLoadPosts: false,
    });
    const removeQueries = vi.spyOn(queryClient, 'removeQueries');

    result.current.resetPostsCache();

    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: ['posts', 'infinite'],
    });
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: ['posts', 'search'],
    });
  });

  it('search query가 선택되면 fetchNextPage도 search query를 따른다', async () => {
    const client = buildMockClient({
      listPosts: vi.fn().mockResolvedValue({
        posts: [],
        nextCursor: 'list-next',
      }),
      searchPosts: vi
        .fn()
        .mockResolvedValueOnce({
          posts: [buildPost('search-1', '첫 검색 결과')],
          nextCursor: 'search-next',
        })
        .mockResolvedValueOnce({
          posts: [buildPost('search-2', '다음 검색 결과')],
          nextCursor: null,
        }),
    });
    const { result } = renderUsePostsArchive({
      client,
      shouldLoadPosts: true,
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

    expect(client.searchPosts as Mock).toHaveBeenLastCalledWith({
      query: 'term',
      cursor: 'search-next',
      limit: undefined,
    });
  });
});
