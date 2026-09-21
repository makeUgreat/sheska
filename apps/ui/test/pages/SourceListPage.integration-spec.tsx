import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type SourceSummary } from '@/entities/source';
import { SourceListPage } from '@/pages/source-list';
import {
  HttpClientProvider,
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

function buildMockHttpClient(
  overrides: MockHttpClientOverrides = {},
): HttpClient {
  return {
    get: vi.fn().mockResolvedValue({
      sources: [],
      page: 1,
      pageSize: 10,
      totalCount: 0,
      totalPages: 0,
    }),
    post: vi.fn(),
    patch: vi.fn(),
    ...overrides,
  } as unknown as HttpClient;
}

function renderPage(
  client: HttpClient,
  queryClient: QueryClient = createTestQueryClient(),
) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <HttpClientProvider client={client}>
          <SourceListPage />
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('SourceListPage', () => {
  it('로딩 중에 Loading 텍스트를 보여준다', () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(client);

    expect(screen.getByRole('heading', { name: 'Sources' })).toBeDefined();
    expect(screen.getByText('Loading')).toBeDefined();
  });

  it('source 목록이 없으면 No sources yet. 메시지를 보여준다', async () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockResolvedValue({
        sources: [],
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
      }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('No sources yet.')).toBeDefined();
    });
  });

  it('source 목록과 상세 링크를 렌더링한다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const source: SourceSummary = {
      sourceId: 'source-1',
      externalSourceId: 'Notes/source.md',
      title: 'Source Title',
      fingerprint: 'fingerprint-1',
      sizeBytes: 14,
      createdAt: now,
      updatedAt: now,
      latestSyncJob: {
        syncJobId: 'sync-job-1',
        status: 'completed',
        totalChunks: 4,
        createdAt: now,
      },
      publishedPostId: null,
    };
    const client = buildMockHttpClient({
      get: vi.fn().mockResolvedValue({
        sources: [source],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      }),
    });

    renderPage(client);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Source Title' });
      expect(link).toBeDefined();
      expect(link.getAttribute('href')).toBe('/sources/source-1');
      expect(
        within(screen.getByRole('list')).getByText('completed'),
      ).toBeDefined();
      expect(screen.getByText(/0\.1 KB/)).toBeDefined();
    });
  });

  it('sync job이 waiting 상태이면 진행률 없이 상태만 보여준다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const source: SourceSummary = {
      sourceId: 'source-1',
      externalSourceId: 'Notes/source.md',
      title: 'Source Title',
      fingerprint: 'fingerprint-1',
      sizeBytes: 14,
      createdAt: now,
      updatedAt: now,
      latestSyncJob: {
        syncJobId: 'sync-job-1',
        status: 'waiting',
        totalChunks: 10,
        createdAt: now,
      },
      publishedPostId: null,
    };
    const client = buildMockHttpClient({
      get: vi.fn().mockResolvedValue({
        sources: [source],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(
        within(screen.getByRole('list')).getByText('waiting'),
      ).toBeDefined();
      expect(screen.queryByRole('progressbar')).toBeNull();
    });
  });

  it('게시된 source는 게시됨 배지를 보여준다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const source: SourceSummary = {
      sourceId: 'source-1',
      externalSourceId: 'Notes/source.md',
      title: 'Source Title',
      fingerprint: 'fingerprint-1',
      sizeBytes: 14,
      createdAt: now,
      updatedAt: now,
      latestSyncJob: null,
      publishedPostId: 'post-1',
    };
    const client = buildMockHttpClient({
      get: vi.fn().mockResolvedValue({
        sources: [source],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('게시됨')).toBeDefined();
    });
  });

  it('게시되지 않은 source는 게시됨 배지를 보여주지 않는다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const source: SourceSummary = {
      sourceId: 'source-1',
      externalSourceId: 'Notes/source.md',
      title: 'Source Title',
      fingerprint: 'fingerprint-1',
      sizeBytes: 14,
      createdAt: now,
      updatedAt: now,
      latestSyncJob: null,
      publishedPostId: null,
    };
    const client = buildMockHttpClient({
      get: vi.fn().mockResolvedValue({
        sources: [source],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Source Title' })).toBeDefined();
    });
    expect(screen.queryByText('게시됨')).toBeNull();
  });

  it('백그라운드 재조회 중에는 목록을 흐리게 하거나 페이지 이동을 막지 않는다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const source: SourceSummary = {
      sourceId: 'source-1',
      externalSourceId: 'Notes/source.md',
      title: 'Source Title',
      fingerprint: 'fingerprint-1',
      sizeBytes: 14,
      createdAt: now,
      updatedAt: now,
      latestSyncJob: {
        syncJobId: 'sync-job-1',
        status: 'waiting',
        totalChunks: 10,
        createdAt: now,
      },
      publishedPostId: null,
    };
    const listSources = vi.fn().mockResolvedValue({
      sources: [source],
      page: 1,
      pageSize: 10,
      totalCount: 12,
      totalPages: 2,
    });
    const queryClient = createTestQueryClient();

    renderPage(buildMockHttpClient({ get: listSources }), queryClient);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Source Title' })).toBeDefined();
    });

    listSources.mockReturnValueOnce(new Promise(() => {}));
    act(() => {
      void queryClient.refetchQueries({ queryKey: ['sources', 'list'] });
    });

    await waitFor(() => {
      expect(listSources).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByRole('list').className).not.toContain('opacity-40');
    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect((nextButton as HTMLButtonElement).disabled).toBe(false);
  });

  it('에러가 발생하면 에러 메시지를 보여준다', async () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockRejectedValue(new Error('API unavailable')),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Error: API unavailable')).toBeDefined();
    });
  });

  it('페이지네이션 버튼을 클릭하면 다음 페이지의 source를 불러온다', async () => {
    const user = userEvent.setup();
    const now = '2026-01-01T00:00:00.000Z';
    const firstSource: SourceSummary = {
      sourceId: 'source-1',
      externalSourceId: 'Notes/first.md',
      title: 'First Title',
      fingerprint: 'fingerprint-1',
      sizeBytes: 14,
      createdAt: now,
      updatedAt: now,
      latestSyncJob: null,
      publishedPostId: null,
    };
    const secondSource: SourceSummary = {
      sourceId: 'source-2',
      externalSourceId: 'Notes/second.md',
      title: 'Second Title',
      fingerprint: 'fingerprint-2',
      sizeBytes: 15,
      createdAt: now,
      updatedAt: now,
      latestSyncJob: null,
      publishedPostId: null,
    };
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        sources: [firstSource],
        page: 1,
        pageSize: 10,
        totalCount: 2,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        sources: [secondSource],
        page: 2,
        pageSize: 10,
        totalCount: 2,
        totalPages: 2,
      });
    const client = buildMockHttpClient({ get });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'First Title' })).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Second Title' })).toBeDefined();
    });
    expect(get).toHaveBeenNthCalledWith(1, '/sources', { page: '1' });
    expect(get).toHaveBeenNthCalledWith(2, '/sources', { page: '2' });
  });
});
