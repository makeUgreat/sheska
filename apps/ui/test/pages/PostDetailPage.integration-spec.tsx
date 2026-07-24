import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '@/api/client-context';
import { type GetPostResponse, type SheskaApiClient } from '@/api/client';
import { PostDetailPage } from '@/pages/PostDetailPage';

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

function buildMockClient(
  overrides: Partial<SheskaApiClient> = {},
): SheskaApiClient {
  return {
    listSources: vi.fn(),
    getSource: vi.fn(),
    listPosts: vi.fn(),
    getPost: vi.fn().mockResolvedValue(MOCK_POST),
    publishPost: vi.fn(),
    ...overrides,
  } as unknown as SheskaApiClient;
}

function renderPage(client: SheskaApiClient, postId = 'post-1') {
  return render(
    <MemoryRouter initialEntries={[`/posts/${postId}`]}>
      <QueryClientProvider client={createTestQueryClient()}>
        <ApiClientProvider client={client}>
          <Routes>
            <Route path="/posts/:id" element={<PostDetailPage />} />
          </Routes>
        </ApiClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('PostDetailPage', () => {
  it('로딩 중에 Loading... 텍스트를 보여준다', () => {
    const client = buildMockClient({
      getPost: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(client);

    expect(screen.getByRole('link', { name: 'Back to posts' })).toBeDefined();
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('post 상세 정보를 렌더링한다', async () => {
    const client = buildMockClient();

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
    const client = buildMockClient({
      getPost: vi.fn().mockRejectedValue(new Error('Post not found')),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Error: Post not found')).toBeDefined();
    });
  });

  it('getPost를 올바른 id로 호출한다', async () => {
    const getPost = vi.fn().mockResolvedValue(MOCK_POST);
    const client = buildMockClient({ getPost });

    renderPage(client, 'post-1');

    await waitFor(() => {
      expect(getPost).toHaveBeenCalledWith('post-1');
    });
  });

  it('Back to posts 링크가 /posts로 연결된다', () => {
    const client = buildMockClient();

    renderPage(client);

    const link = screen.getByRole('link', { name: 'Back to posts' });
    expect((link as HTMLAnchorElement).href).toContain('/posts');
  });
});
