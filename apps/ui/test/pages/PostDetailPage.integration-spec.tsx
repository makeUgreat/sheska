import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type GetPostResponse } from '@/entities/post';
import { PostDetailPage } from '@/pages/post-detail';
import {
  HttpClientProvider,
  HttpError,
  type HttpClientType as HttpClient,
} from '@/shared/api';

type MockHttpClientOverrides = {
  get?: ReturnType<typeof vi.fn>;
  post?: ReturnType<typeof vi.fn>;
  patch?: ReturnType<typeof vi.fn>;
};

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const NOW = '2026-01-05T12:00:00.000Z';
const MOCK_POST: GetPostResponse = {
  postId: 'post-1',
  sourceId: 'source-1',
  title: '테스트 포스트',
  viewCount: 7,
  createdAt: NOW,
  updatedAt: NOW,
  body: [
    'Layers point downward, see [[feature-sliced-design|FSD]].',
    '',
    '## Layers',
    '',
    'A page composes widgets.',
    '',
    '## Segments',
    '',
    'A slice exposes its public API.',
  ].join('\n'),
};

function buildMockHttpClient(
  overrides: MockHttpClientOverrides = {},
): HttpClient {
  return {
    get: vi.fn().mockResolvedValue(MOCK_POST),
    post: vi.fn(),
    patch: vi.fn(),
    ...overrides,
  } as unknown as HttpClient;
}

function renderPage(client: HttpClient, postId = 'post-1') {
  return render(
    <MemoryRouter initialEntries={[`/posts/${postId}`]}>
      <QueryClientProvider client={createTestQueryClient()}>
        <HttpClientProvider client={client}>
          <Routes>
            <Route path="/posts/:id" element={<PostDetailPage />} />
          </Routes>
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function renderPageWithoutId(client: HttpClient) {
  return render(
    <MemoryRouter initialEntries={['/posts']}>
      <QueryClientProvider client={createTestQueryClient()}>
        <HttpClientProvider client={client}>
          <Routes>
            <Route path="/posts" element={<PostDetailPage />} />
          </Routes>
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('PostDetailPage', () => {
  it('로딩 중에 Loading 텍스트를 보여준다', () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(client);

    expect(screen.getByRole('link', { name: 'Back to posts' })).toBeDefined();
    expect(screen.getByText('Loading')).toBeDefined();
  });

  it('post 제목과 갱신 일자, 조회수를 렌더링한다', async () => {
    renderPage(buildMockHttpClient());

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: '테스트 포스트' }),
      ).toBeDefined();
    });
    expect(screen.getByText('Jan 5, 2026')).toBeDefined();
    expect(screen.getByText('7 views')).toBeDefined();
  });

  it('본문 heading에 outline과 같은 anchor id를 붙인다', async () => {
    renderPage(buildMockHttpClient());

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Layers' })).toBeDefined();
    });
    expect(screen.getByRole('heading', { name: 'Layers' }).id).toBe('layers');
    expect(screen.getByRole('heading', { name: 'Segments' }).id).toBe(
      'segments',
    );
  });

  it('heading이 둘 이상이면 outline navigation을 보여준다', async () => {
    renderPage(buildMockHttpClient());

    const outline = await screen.findByRole('navigation', {
      name: 'On this page',
    });

    expect(
      within(outline)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['#layers', '#segments']);
  });

  it('heading이 없으면 outline navigation을 보여주지 않는다', async () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockResolvedValue({ ...MOCK_POST, body: '제목 없는 본문' }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('제목 없는 본문')).toBeDefined();
    });
    expect(
      screen.queryByRole('navigation', { name: 'On this page' }),
    ).toBeNull();
  });

  it('resolve되지 않은 wiki link를 label만 남겨 렌더링한다', async () => {
    renderPage(buildMockHttpClient());

    const link = await screen.findByTitle('FSD — no note yet');

    expect(link.textContent).toBe('FSD');
  });

  it('에러가 발생하면 상태 코드와 실패한 대상을 보여준다', async () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockRejectedValue(new HttpError(503, 'Service Unavailable')),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
    expect(screen.getByText('503')).toBeDefined();
    expect(
      screen.getByText('Something went wrong while loading.'),
    ).toBeDefined();
  });

  it('post id가 없으면 빈 상태 메시지를 보여준다', () => {
    const getPost = vi.fn();

    renderPageWithoutId(buildMockHttpClient({ get: getPost }));

    expect(
      screen.getByText('This page does not exist, or it was removed.'),
    ).toBeDefined();
    expect(getPost).not.toHaveBeenCalled();
  });

  it('getPost를 올바른 id로 호출한다', async () => {
    const getPost = vi.fn().mockResolvedValue(MOCK_POST);

    renderPage(buildMockHttpClient({ get: getPost }), 'post-42');

    await waitFor(() => {
      expect(getPost).toHaveBeenCalledWith('/posts/post-42');
    });
  });

  it('Back to posts 링크가 /posts로 연결된다', () => {
    renderPage(buildMockHttpClient());

    const link = screen.getByRole('link', { name: 'Back to posts' });

    expect((link as HTMLAnchorElement).href).toContain('/posts');
  });
});
