import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '@/api/client-context';
import {
  type GetSourceResponse,
  type SheskaApiClient,
  type SourceSummary,
} from '@/api/client';
import { App } from '@/App';

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const NOW = '2026-01-01T00:00:00.000Z';

const SOURCE_SUMMARY: SourceSummary = {
  sourceId: 'source-1',
  externalSourceId: 'Notes/source.md',
  fingerprint: 'fingerprint-1',
  sizeBytes: 14,
  createdAt: NOW,
  updatedAt: NOW,
  latestSyncJob: null,
};

const SOURCE_DETAIL: GetSourceResponse = {
  ...SOURCE_SUMMARY,
  content: '# Source note',
  embedding: null,
};

function buildMockClient(
  overrides: Partial<SheskaApiClient> = {},
): SheskaApiClient {
  return {
    listSources: vi.fn().mockResolvedValue({ sources: [SOURCE_SUMMARY] }),
    getSource: vi.fn().mockResolvedValue(SOURCE_DETAIL),
    get: vi.fn(),
    ...overrides,
  } as unknown as SheskaApiClient;
}

function renderApp(client: SheskaApiClient) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <QueryClientProvider client={createTestQueryClient()}>
        <ApiClientProvider client={client}>
          <App />
        </ApiClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('source 목록에서 상세 화면으로 이동한다', async () => {
    const user = userEvent.setup();
    const getSource = vi.fn().mockResolvedValue(SOURCE_DETAIL);
    const client = buildMockClient({ getSource });

    renderApp(client);

    await user.click(
      await screen.findByRole('link', { name: 'Notes/source.md' }),
    );

    await waitFor(() => {
      expect(getSource).toHaveBeenCalledWith('source-1');
      expect(
        screen.getByRole('heading', { name: 'Notes/source.md' }),
      ).toBeDefined();
      expect(screen.getByText('# Source note')).toBeDefined();
    });
  });
});
