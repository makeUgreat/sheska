import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '@/api/client-context';
import { type GetSourceResponse, type SheskaApiClient } from '@/api/client';
import { SourceDetailPage } from '@/pages/SourceDetailPage';

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const NOW = '2026-01-01T00:00:00.000Z';
const MOCK_SOURCE: GetSourceResponse = {
  sourceId: 'source-1',
  externalSourceId: 'Notes/source.md',
  content: '# Source note',
  fingerprint: 'fingerprint-1',
  sizeBytes: 14,
  createdAt: NOW,
  updatedAt: NOW,
  latestSyncJob: {
    syncJobId: 'sync-job-1',
    status: 'completed',
    createdAt: NOW,
  },
  embedding: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    createdAt: NOW,
    updatedAt: NOW,
  },
};

const MOCK_POST = {
  postId: 'post-1',
  sourceId: 'source-1',
  title: '테스트 포스트',
  viewCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
};

function buildMockClient(
  overrides: Partial<SheskaApiClient> = {},
): SheskaApiClient {
  return {
    listSources: vi.fn(),
    getSource: vi.fn().mockResolvedValue(MOCK_SOURCE),
    listPosts: vi.fn().mockResolvedValue({ posts: [] }),
    publishPost: vi.fn().mockResolvedValue(MOCK_POST),
    get: vi.fn(),
    ...overrides,
  } as unknown as SheskaApiClient;
}

function renderPage(client: SheskaApiClient, sourceId = 'source-1') {
  return render(
    <MemoryRouter initialEntries={[`/sources/${sourceId}`]}>
      <QueryClientProvider client={createTestQueryClient()}>
        <ApiClientProvider client={client}>
          <Routes>
            <Route path="/sources/:id" element={<SourceDetailPage />} />
          </Routes>
        </ApiClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('SourceDetailPage', () => {
  it('로딩 중에 Loading... 텍스트를 보여준다', () => {
    const client = buildMockClient({
      getSource: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(client);

    expect(
      screen.getByRole('link', { name: '← Back to sources' }),
    ).toBeDefined();
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('source 상세 정보를 렌더링한다', async () => {
    const client = buildMockClient();

    renderPage(client);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Notes/source.md' }),
      ).toBeDefined();
      expect(screen.getByText('# Source note')).toBeDefined();
      expect(screen.getByText('source-1')).toBeDefined();
      expect(screen.getByText('fingerprint-1')).toBeDefined();
      expect(screen.getByText('completed')).toBeDefined();
      expect(screen.getByText('sync-job-1')).toBeDefined();
      expect(screen.getByText('text-embedding-3-small')).toBeDefined();
      expect(screen.getByText('1536')).toBeDefined();
    });
  });

  it('embedding과 sync job이 없으면 빈 상태를 렌더링한다', async () => {
    const client = buildMockClient({
      getSource: vi.fn().mockResolvedValue({
        ...MOCK_SOURCE,
        latestSyncJob: null,
        embedding: null,
      }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('No job')).toBeDefined();
      expect(screen.getByText('Not yet generated')).toBeDefined();
    });
  });

  it('에러가 발생하면 에러 메시지를 보여준다', async () => {
    const client = buildMockClient({
      getSource: vi.fn().mockRejectedValue(new Error('Source not found')),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Error: Source not found')).toBeDefined();
    });
  });

  it('getSource를 올바른 id로 호출한다', async () => {
    const getSource = vi.fn().mockResolvedValue(MOCK_SOURCE);
    const client = buildMockClient({ getSource });

    renderPage(client, 'source-1');

    await waitFor(() => {
      expect(getSource).toHaveBeenCalledWith('source-1');
    });
  });

  describe('게시하기', () => {
    it('게시하기 버튼이 렌더링된다', async () => {
      const client = buildMockClient();

      renderPage(client);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: '게시하기' })).toBeDefined();
        expect(screen.getByRole('button', { name: '게시하기' })).toBeDefined();
      });
    });

    it('게시 중이면 게시하기 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      const client = buildMockClient({
        publishPost: vi.fn().mockReturnValue(new Promise(() => {})),
      });

      renderPage(client);

      await waitFor(() => screen.getByRole('heading', { name: '게시하기' }));
      await user.click(screen.getByRole('button', { name: '게시하기' }));

      await waitFor(() => {
        const button = screen.getByRole('button', { name: '게시 중...' });
        expect((button as HTMLButtonElement).disabled).toBe(true);
      });
    });

    it('게시하기 클릭 시 publishPost가 sourceId로 호출된다', async () => {
      const user = userEvent.setup();
      const publishPost = vi.fn().mockResolvedValue(MOCK_POST);
      const client = buildMockClient({ publishPost });

      renderPage(client);

      await waitFor(() => screen.getByRole('heading', { name: '게시하기' }));

      await user.click(screen.getByRole('button', { name: '게시하기' }));

      await waitFor(() => {
        expect(publishPost).toHaveBeenCalledWith({
          sourceId: 'source-1',
        });
      });
    });

    it('게시 성공 시 성공 메시지와 포스트 목록 링크가 표시된다', async () => {
      const user = userEvent.setup();
      const client = buildMockClient();

      renderPage(client);

      await waitFor(() => screen.getByRole('heading', { name: '게시하기' }));

      await user.click(screen.getByRole('button', { name: '게시하기' }));

      await waitFor(() => {
        expect(screen.getByText(/포스트가 게시되었습니다/)).toBeDefined();
        expect(
          screen.getByRole('link', { name: '포스트 목록 보기' }),
        ).toBeDefined();
      });
    });

    it('게시 실패 시 에러 메시지가 표시된다', async () => {
      const user = userEvent.setup();
      const client = buildMockClient({
        publishPost: vi
          .fn()
          .mockRejectedValue(new Error('이미 게시된 포스트가 있습니다')),
      });

      renderPage(client);

      await waitFor(() => screen.getByRole('heading', { name: '게시하기' }));

      await user.click(screen.getByRole('button', { name: '게시하기' }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeDefined();
        expect(
          screen.getByText('오류: 이미 게시된 포스트가 있습니다'),
        ).toBeDefined();
      });
    });
  });
});
