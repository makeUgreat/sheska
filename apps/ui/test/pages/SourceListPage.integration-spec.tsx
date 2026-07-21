import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '@/api/client-context';
import { type SheskaApiClient, type SourceSummary } from '@/api/client';
import { SourceListPage } from '@/pages/SourceListPage';

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function buildMockClient(
  overrides: Partial<SheskaApiClient> = {},
): SheskaApiClient {
  return {
    listSources: vi.fn().mockResolvedValue({ sources: [] }),
    getSource: vi.fn(),
    get: vi.fn(),
    ...overrides,
  } as unknown as SheskaApiClient;
}

function renderPage(client: SheskaApiClient) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={createTestQueryClient()}>
        <ApiClientProvider client={client}>
          <SourceListPage />
        </ApiClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('SourceListPage', () => {
  it('로딩 중에 Loading... 텍스트를 보여준다', () => {
    const client = buildMockClient({
      listSources: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(client);

    expect(screen.getByRole('heading', { name: 'Sources' })).toBeDefined();
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('source 목록이 없으면 No sources yet. 메시지를 보여준다', async () => {
    const client = buildMockClient({
      listSources: vi.fn().mockResolvedValue({ sources: [] }),
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
    const client = buildMockClient({
      listSources: vi.fn().mockResolvedValue({
        sources: [source],
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
    const client = buildMockClient({
      listSources: vi.fn().mockResolvedValue({
        sources: [source],
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
    const client = buildMockClient({
      listSources: vi.fn().mockResolvedValue({
        sources: [source],
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
    const client = buildMockClient({
      listSources: vi.fn().mockResolvedValue({
        sources: [source],
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
    const client = buildMockClient({
      listSources: vi.fn().mockRejectedValue(new Error('API unavailable')),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Error: API unavailable')).toBeDefined();
    });
  });
});
