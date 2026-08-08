import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    get: vi.fn().mockResolvedValue({ sources: [], nextCursor: null }),
    post: vi.fn(),
    patch: vi.fn(),
    ...overrides,
  } as unknown as HttpClient;
}

function renderPage(client: HttpClient) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={createTestQueryClient()}>
        <HttpClientProvider client={client}>
          <SourceListPage />
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('SourceListPage', () => {
  it('로딩 중에 Loading... 텍스트를 보여준다', () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(client);

    expect(screen.getByRole('heading', { name: 'Sources' })).toBeDefined();
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('source 목록이 없으면 No sources yet. 메시지를 보여준다', async () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockResolvedValue({ sources: [] }),
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
      fingerprint: 'fingerprint-1',
      sizeBytes: 14,
      createdAt: now,
      updatedAt: now,
      latestSyncJob: {
        syncJobId: 'sync-job-1',
        status: 'completed',
        totalChunks: 4,
        processedChunks: 4,
        createdAt: now,
      },
      publishedPostId: null,
    };
    const client = buildMockHttpClient({
      get: vi.fn().mockResolvedValue({
        sources: [source],
        nextCursor: null,
      }),
    });

    renderPage(client);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Notes/source.md' });
      expect(link).toBeDefined();
      expect(link.getAttribute('href')).toBe('/sources/source-1');
      expect(screen.getByText('completed')).toBeDefined();
      expect(screen.getByText(/14 bytes/)).toBeDefined();
    });
  });

  it('sync job이 processing 상태이면 진행률을 보여준다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const source: SourceSummary = {
      sourceId: 'source-1',
      externalSourceId: 'Notes/source.md',
      fingerprint: 'fingerprint-1',
      sizeBytes: 14,
      createdAt: now,
      updatedAt: now,
      latestSyncJob: {
        syncJobId: 'sync-job-1',
        status: 'processing',
        totalChunks: 10,
        processedChunks: 3,
        createdAt: now,
      },
      publishedPostId: null,
    };
    const client = buildMockHttpClient({
      get: vi.fn().mockResolvedValue({
        sources: [source],
        nextCursor: null,
      }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('processing')).toBeDefined();
      expect(screen.getByText('3/10 (30%)')).toBeDefined();
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar.getAttribute('aria-valuenow')).toBe('30');
    });
  });

  it('게시된 source는 게시됨 배지를 보여준다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const source: SourceSummary = {
      sourceId: 'source-1',
      externalSourceId: 'Notes/source.md',
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
        nextCursor: null,
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
        nextCursor: null,
      }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Notes/source.md' }),
      ).toBeDefined();
    });
    expect(screen.queryByText('게시됨')).toBeNull();
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

  it('다음 cursor가 있으면 추가 source를 불러온다', async () => {
    const user = userEvent.setup();
    const now = '2026-01-01T00:00:00.000Z';
    const firstSource: SourceSummary = {
      sourceId: 'source-1',
      externalSourceId: 'Notes/first.md',
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
        nextCursor: 'cursor-1',
      })
      .mockResolvedValueOnce({
        sources: [secondSource],
        nextCursor: null,
      });
    const client = buildMockHttpClient({ get });

    renderPage(client);

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Notes/first.md' }),
      ).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: 'Load more' }));

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Notes/second.md' }),
      ).toBeDefined();
    });
    expect(get).toHaveBeenNthCalledWith(1, '/sources', undefined);
    expect(get).toHaveBeenNthCalledWith(2, '/sources', {
      cursor: 'cursor-1',
    });
  });
});
