import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '@/api/client-context';
import { type SheskaApiClient } from '@/api/client';
import { SourceDetailPage } from './SourceDetailPage';

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const NOW = '2026-01-01T00:00:00.000Z';
const MOCK_SOURCE = {
  sourceId: 'source-1',
  externalSourceId: 'Notes/source.md',
  content: '# Source note',
  fingerprint: 'fingerprint-1',
  sizeBytes: 14,
  createdAt: NOW,
  updatedAt: NOW,
};

function buildMockClient(
  overrides: Partial<SheskaApiClient> = {},
): SheskaApiClient {
  return {
    listSources: vi.fn(),
    getSource: vi.fn().mockResolvedValue(MOCK_SOURCE),
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

    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('source 상세 정보를 렌더링한다', async () => {
    const client = buildMockClient();

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('Notes/source.md')).toBeDefined();
      expect(screen.getByText('# Source note')).toBeDefined();
      expect(screen.getByText('source-1')).toBeDefined();
      expect(screen.getByText('fingerprint-1')).toBeDefined();
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
});
