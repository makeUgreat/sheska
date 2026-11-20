import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PostSummary } from '@/entities/post';
import { PostsPage } from '@/pages/posts';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';

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
  it('렌더링 즉시 post 목록을 로딩하며 Loading 텍스트를 보여준다', async () => {
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getAllByText('Loading').length).toBeGreaterThan(0);
    });
  });

  it('post 목록이 없으면 빈 상태 메시지를 보여준다', async () => {
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockResolvedValue({ posts: [], nextCursor: null }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('Nothing has been collected yet.')).toBeDefined();
    });
  });

  it('post 목록을 상세 링크로 렌더링한다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const post: PostSummary = {
      postId: 'post-1',
      sourceId: 'source-1',
      title: '테스트 포스트',
      viewCount: 5,
      summary: { status: 'pending' },
      createdAt: now,
      updatedAt: now,
    };
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockResolvedValue({ posts: [post], nextCursor: null }),
    });

    renderPage(client);

    const link = await screen.findByRole('link', { name: /테스트 포스트/ });
    expect(link.getAttribute('href')).toBe('/posts/post-1');
  });

  it('post 항목 안에 조회수를 보여준다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const posts: PostSummary[] = [
      {
        postId: 'post-1',
        sourceId: 'source-1',
        title: '많이 읽은 포스트',
        viewCount: 1208,
        summary: { status: 'pending' },
        createdAt: now,
        updatedAt: now,
      },
      {
        postId: 'post-2',
        sourceId: 'source-2',
        title: '한 번 읽은 포스트',
        viewCount: 1,
        summary: { status: 'pending' },
        createdAt: now,
        updatedAt: now,
      },
    ];
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockResolvedValue({ posts, nextCursor: null }),
    });

    renderPage(client);

    const popular = await screen.findByRole('link', { name: /많이 읽은 포스트/ });
    const once = screen.getByRole('link', { name: /한 번 읽은 포스트/ });
    expect(within(popular).getByText('1,208 views')).toBeDefined();
    expect(within(once).getByText('1 view')).toBeDefined();
  });

  it('검색 중이 아니면 post마다 요약이 준비되지 않았다고 알린다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const post: PostSummary = {
      postId: 'post-1',
      sourceId: 'source-1',
      title: '요약 없는 포스트',
      viewCount: 1,
      summary: { status: 'pending' },
      createdAt: now,
      updatedAt: now,
    };
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockResolvedValue({ posts: [post], nextCursor: null }),
    });

    renderPage(client);

    const link = await screen.findByRole('link', { name: /요약 없는 포스트/ });
    expect(within(link).getByText('Summary not ready yet')).toBeDefined();
  });

  it('요약이 있으면 받은 줄을 모두 보여준다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const lines = ['첫 문장이다.', '둘째 문장이다.'];
    const post: PostSummary = {
      postId: 'post-1',
      sourceId: 'source-1',
      title: '요약 있는 포스트',
      viewCount: 1,
      summary: { status: 'ready', lines },
      createdAt: now,
      updatedAt: now,
    };
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockResolvedValue({ posts: [post], nextCursor: null }),
    });

    renderPage(client);

    const link = await screen.findByRole('link', { name: /요약 있는 포스트/ });
    lines.forEach((line) => expect(within(link).getByText(line)).toBeDefined());
  });

  it('요약을 만들지 못했으면 숨기지 않고 실패를 알린다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const post: PostSummary = {
      postId: 'post-1',
      sourceId: 'source-1',
      title: '요약 실패한 포스트',
      viewCount: 1,
      summary: { status: 'failed' },
      createdAt: now,
      updatedAt: now,
    };
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockResolvedValue({ posts: [post], nextCursor: null }),
    });

    renderPage(client);

    const link = await screen.findByRole('link', { name: /요약 실패한 포스트/ });
    expect(within(link).getByText('Summary could not be generated.')).toBeDefined();
  });

  it('검색 결과에는 요약 안내 대신 검색어 주변 본문을 보여준다', async () => {
    const user = userEvent.setup();
    const now = '2026-01-01T00:00:00.000Z';
    const post: PostSummary = {
      postId: 'search-1',
      sourceId: 'source-1',
      title: '검색된 포스트',
      viewCount: 1,
      summary: { status: 'pending' },
      createdAt: now,
      updatedAt: now,
      snippet: 'garden 근처 본문',
    };
    const client = buildMockHttpClient({
      searchPosts: vi.fn().mockResolvedValue({ posts: [post], nextCursor: null, semanticSearchApplied: false }),
    });

    renderPage(client);
    await user.type(screen.getByLabelText('Search posts by title or content'), 'garden{Enter}');

    const link = await screen.findByRole('link', { name: /검색된 포스트/ });
    expect(within(link).getByText(/근처 본문/)).toBeDefined();
    expect(within(link).queryByText('Summary not ready yet')).toBeNull();
  });

  it('post를 작성 연도별로 묶어 보여준다', async () => {
    const posts: PostSummary[] = [
      {
        postId: 'post-1',
        sourceId: 'source-1',
        title: '올해 포스트',
        viewCount: 1,
        summary: { status: 'pending' },
        createdAt: '2026-03-01T12:00:00.000Z',
        updatedAt: '2026-03-01T12:00:00.000Z',
      },
      {
        postId: 'post-2',
        sourceId: 'source-2',
        title: '작년 포스트',
        viewCount: 2,
        summary: { status: 'pending' },
        createdAt: '2025-03-01T12:00:00.000Z',
        updatedAt: '2025-03-01T12:00:00.000Z',
      },
    ];
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockResolvedValue({ posts, nextCursor: null }),
    });

    renderPage(client);

    const thisYear = await screen.findByRole('region', { name: '2026' });
    const lastYear = screen.getByRole('region', { name: '2025' });
    expect(within(thisYear).getByRole('link', { name: /올해 포스트/ })).toBeDefined();
    expect(within(lastYear).getByRole('link', { name: /작년 포스트/ })).toBeDefined();
  });

  it('의미 검색으로 찾은 항목은 유사도를 항목 안에 보여준다', async () => {
    const user = userEvent.setup();
    const now = '2026-01-01T00:00:00.000Z';
    const posts: PostSummary[] = [
      {
        postId: 'semantic-1',
        sourceId: 'source-1',
        title: '의미로 찾은 포스트',
        viewCount: 1,
        summary: { status: 'pending' },
        createdAt: now,
        updatedAt: now,
        similarity: 91,
      },
      {
        postId: 'keyword-1',
        sourceId: 'source-2',
        title: '키워드로 찾은 포스트',
        viewCount: 2,
        summary: { status: 'pending' },
        createdAt: now,
        updatedAt: now,
        similarity: null,
      },
    ];
    const client = buildMockHttpClient({
      searchPosts: vi.fn().mockResolvedValue({ posts, nextCursor: null, semanticSearchApplied: true }),
    });

    renderPage(client);
    await user.type(screen.getByLabelText('Search posts by title or content'), 'garden{Enter}');

    const semantic = await screen.findByRole('link', { name: /의미로 찾은 포스트/ });
    const keyword = screen.getByRole('link', { name: /키워드로 찾은 포스트/ });
    expect(within(semantic).getByText('91% match')).toBeDefined();
    expect(within(keyword).queryByText(/% match/)).toBeNull();
  });

  it('에러가 발생하면 상태 코드와 실패한 대상을 보여준다', async () => {
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockRejectedValue(new HttpError(500, 'Internal Server Error')),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('500')).toBeDefined();
      expect(screen.getByText('Something went wrong while loading.')).toBeDefined();
    });
  });

  it('렌더링 즉시 post 목록 API를 호출한다', async () => {
    const listPosts = vi.fn().mockResolvedValue({ posts: [], nextCursor: null });
    const client = buildMockHttpClient({ listPosts });

    renderPage(client);

    await waitFor(() => {
      expect(listPosts).toHaveBeenCalledTimes(1);
    });
  });

  it('페이지 제목을 보여준다', () => {
    const client = buildMockHttpClient();

    renderPage(client);

    expect(screen.getByRole('heading', { level: 1, name: 'Posts' })).toBeDefined();
  });

  it('검색어 입력만으로는 searchPosts를 호출하지 않는다', async () => {
    const user = userEvent.setup();
    const searchPosts = vi.fn().mockResolvedValue({ posts: [], nextCursor: null });
    const client = buildMockHttpClient({ searchPosts });

    renderPage(client);

    await user.type(screen.getByLabelText('Search posts by title or content'), 'garden');

    expect(searchPosts).not.toHaveBeenCalled();
  });

  it('Enter를 누르면 검색한다', async () => {
    const user = userEvent.setup();
    const now = '2026-01-01T00:00:00.000Z';
    const post: PostSummary = {
      postId: 'search-1',
      sourceId: 'source-1',
      title: 'Garden Search Result',
      viewCount: 3,
      summary: { status: 'pending' },
      createdAt: now,
      updatedAt: now,
    };
    const searchPosts = vi.fn().mockResolvedValue({
      posts: [post],
      nextCursor: null,
      semanticSearchApplied: true,
    });
    const client = buildMockHttpClient({ searchPosts });

    renderPage(client);

    await user.type(screen.getByLabelText('Search posts by title or content'), 'garden{Enter}');

    await waitFor(() => {
      expect(searchPosts).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('link', { name: /Garden Search Result/ })).toBeDefined();
    });
  });

  it('Search 버튼을 누르면 검색한다', async () => {
    const user = userEvent.setup();
    const searchPosts = vi.fn().mockResolvedValue({
      posts: [],
      nextCursor: null,
      semanticSearchApplied: false,
    });
    const client = buildMockHttpClient({ searchPosts });

    renderPage(client);

    await user.type(screen.getByLabelText('Search posts by title or content'), 'fts');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(searchPosts).toHaveBeenCalledTimes(1);
      expect(screen.getByText('"fts"')).toBeDefined();
      expect(screen.getByText('Nothing matches this.')).toBeDefined();
    });
  });
});
