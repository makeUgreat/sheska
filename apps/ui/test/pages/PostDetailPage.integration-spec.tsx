import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpClientProvider } from '@/shared/api/http-client-context';
import { type GetPostResponse } from '@/entities/posts/api/types';
import { PostDetailPage } from '@/pages/PostDetailPage';
import { type HttpClient } from '@/shared/api/http';

type MockHttpClientOverrides = {
  get?: ReturnType<typeof vi.fn>;
  post?: ReturnType<typeof vi.fn>;
  patch?: ReturnType<typeof vi.fn>;
};

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const NOW = '2026-01-01T00:00:00.000Z';
const MOCK_POST: GetPostResponse = {
  postId: 'post-1',
  sourceId: 'source-1',
  title: '테스트 포스트',
  viewCount: 7,
  createdAt: NOW,
  updatedAt: NOW,
  sourceContent: '---\ntitle: 테스트 포스트\n---\n본문 내용입니다.',
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

describe('PostDetailPage', () => {
  it('로딩 중에 Loading... 텍스트를 보여준다', () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(client);

    expect(screen.getByRole('link', { name: 'Back to posts' })).toBeDefined();
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('post 상세 정보를 렌더링한다', async () => {
    const client = buildMockHttpClient();

    renderPage(client);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '테스트 포스트' }),
      ).toBeDefined();
      expect(screen.getByText('post-1')).toBeDefined();
      expect(screen.getByText('source-1')).toBeDefined();
      expect(screen.getByText('7')).toBeDefined();
    });
  });

  it('에러가 발생하면 에러 메시지를 보여준다', async () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockRejectedValue(new Error('Post not found')),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Error: Post not found')).toBeDefined();
    });
  });

  it('getPost를 올바른 id로 호출한다', async () => {
    const getPost = vi.fn().mockResolvedValue(MOCK_POST);
    const client = buildMockHttpClient({ get: getPost });

    renderPage(client, 'post-1');

    await waitFor(() => {
      expect(getPost).toHaveBeenCalledWith('/posts/post-1');
    });
  });

  it('Back to posts 링크가 /posts로 연결된다', () => {
    const client = buildMockHttpClient();

    renderPage(client);

    const link = screen.getByRole('link', { name: 'Back to posts' });
    expect((link as HTMLAnchorElement).href).toContain('/posts');
  });
});
