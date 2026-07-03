import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '@/api/client-context';
import { type SheskaApiClient } from '@/api/client';
import { SourceListPage } from './SourceListPage';

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

  it('source 목록을 렌더링한다', async () => {
    const now = '2026-01-01T00:00:00.000Z';
    const client = buildMockClient({
      listSources: vi.fn().mockResolvedValue({
        sources: [
          {
            sourceId: 'source-1',
            externalSourceId: 'Notes/source.md',
            fingerprint: 'fingerprint-1',
            sizeBytes: 14,
            createdAt: now,
            updatedAt: now,
          },
        ],
      }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('Notes/source.md')).toBeDefined();
    });
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
