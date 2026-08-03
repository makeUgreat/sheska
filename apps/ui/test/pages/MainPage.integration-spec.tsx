import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PostSummary } from '@/entities/posts/api/types';
import { MainPage } from '@/pages/MainPage';
import { type HttpClient } from '@/shared/api/http';
import { HttpClientProvider } from '@/shared/api/http-client-context';

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
          <MainPage />
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

type IntersectionCallback = IntersectionObserverCallback;

const intersectionCallbacks: IntersectionCallback[] = [];
const scrollIntoView = vi.fn();
const scrollTo = vi.fn();
const scrollBy = vi.fn();

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '0px';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(callback: IntersectionCallback) {
    intersectionCallbacks.push(callback);
  }

  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn((): IntersectionObserverEntry[] => []);
  unobserve = vi.fn();
}

function triggerPostsEntry() {
  act(() => {
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 700 }));
    intersectionCallbacks[0]?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
}

async function enterPostsList() {
  triggerPostsEntry();
  await waitFor(
    () => {
      expect(screen.getByText('The Garden')).toBeDefined();
    },
    { timeout: 2500 },
  );
}

describe('MainPage', () => {
  beforeEach(() => {
    intersectionCallbacks.length = 0;
    scrollIntoView.mockClear();
    scrollTo.mockClear();
    scrollBy.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
    window.scrollTo = scrollTo;
    window.scrollBy = scrollBy;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('초기 post 로딩 중에 loading posts와 loading dots를 보여준다', async () => {
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(client);
    triggerPostsEntry();

    await waitFor(() => {
      expect(screen.getAllByText('Loading posts...').length).toBeGreaterThan(0);
    });
    expect(
      screen.getByText('Scroll For Articles').closest('a')?.className,
    ).toContain('opacity-0');
    expect(
      screen.getByText('HASH').closest('section')?.parentElement?.className,
    ).not.toContain('posts-entry-settle');
  });

  it('post 목록이 없으면 No posts yet. 메시지를 보여준다', async () => {
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockResolvedValue({ posts: [], nextCursor: null }),
    });

    renderPage(client);
    await enterPostsList();

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
    await enterPostsList();

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
    await enterPostsList();

    await waitFor(() => {
      expect(screen.getByText('첫 번째 포스트')).toBeDefined();
      expect(screen.getByText('1 views')).toBeDefined();
      expect(screen.getByText('두 번째 포스트')).toBeDefined();
      expect(screen.getByText('2 views')).toBeDefined();
    });
  });

  it('scroll to explore 인디케이터에 bounce 애니메이션이 적용되어 있다', () => {
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockResolvedValue({ posts: [], nextCursor: null }),
    });

    renderPage(client);

    const indicator = screen.getByText('Scroll For Articles').closest('a');
    expect(indicator?.className).toContain('animate-bounce');
  });

  it('에러가 발생하면 에러 메시지를 보여준다', async () => {
    const client = buildMockHttpClient({
      listPosts: vi.fn().mockRejectedValue(new Error('API unavailable')),
    });

    renderPage(client);
    await enterPostsList();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Error: API unavailable')).toBeDefined();
    });
  });

  it('posts 섹션 진입 전에는 post 목록 API를 호출하지 않는다', async () => {
    const listPosts = vi.fn().mockResolvedValue({
      posts: [],
      nextCursor: null,
    });
    const countPosts = vi.fn().mockResolvedValue({ count: 0 });
    const client = buildMockHttpClient({ countPosts, listPosts });

    renderPage(client);

    await waitFor(() => {
      expect(countPosts).toHaveBeenCalled();
    });
    expect(screen.queryByText('The Garden')).toBeNull();
    expect(listPosts).not.toHaveBeenCalled();

    triggerPostsEntry();

    await waitFor(() => {
      expect(listPosts).toHaveBeenCalledTimes(1);
    });
    expect(screen.getAllByText('Loading posts...').length).toBeGreaterThan(0);
    expect(screen.queryByText('The Garden')).toBeNull();

    await waitFor(
      () => {
        expect(scrollIntoView).toHaveBeenCalledWith({
          block: 'start',
          behavior: 'smooth',
        });
        expect(
          screen.getByRole('button', { name: 'Back to top' }),
        ).toBeDefined();
        expect(screen.getByText('The Garden')).toBeDefined();
      },
      { timeout: 2500 },
    );
  });

  it('메인 진입 화면에서는 footer를 숨기고 post 목록 진입 후 보여준다', async () => {
    const client = buildMockHttpClient();

    renderPage(client);

    expect(screen.queryByText('The Garden')).toBeNull();

    await enterPostsList();

    expect(screen.getByText('The Garden')).toBeDefined();
  });

  it('Back to top으로만 초기 view로 돌아가고 다시 진입하면 post 목록을 재조회한다', async () => {
    const user = userEvent.setup();
    const listPosts = vi
      .fn()
      .mockResolvedValue({ posts: [], nextCursor: null });
    const client = buildMockHttpClient({ listPosts });

    renderPage(client);

    expect(screen.getByText('HASH')).toBeDefined();
    await enterPostsList();

    await waitFor(() => {
      expect(listPosts).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText('HASH')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Back to top' }));

    await waitFor(() => {
      expect(screen.getByText('HASH')).toBeDefined();
      expect(screen.queryByText('The Garden')).toBeNull();
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    await enterPostsList();

    await waitFor(() => {
      expect(listPosts).toHaveBeenCalledTimes(2);
    });
  });

  it('terminal note count는 count API 응답으로 보여준다', async () => {
    const post: PostSummary = {
      postId: 'post-1',
      sourceId: 'source-1',
      title: '테스트 포스트',
      viewCount: 5,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const client = buildMockHttpClient({
      countPosts: vi.fn().mockResolvedValue({ count: 7 }),
      listPosts: vi.fn().mockResolvedValue({ posts: [post], nextCursor: null }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText(/- 7 notes found in \/posts/)).toBeDefined();
    });
  });
});
