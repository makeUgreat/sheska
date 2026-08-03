import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  type GetSourceResponse,
  type SourceSummary,
} from '@/entities/sources/api/types';
import { App } from '@/app/App';
import { type HttpClient } from '@/shared/api/http';
import { HttpClientProvider } from '@/shared/api/http-client-context';

type MockHttpClientOverrides = {
  get?: ReturnType<typeof vi.fn>;
  post?: ReturnType<typeof vi.fn>;
  patch?: ReturnType<typeof vi.fn>;
};

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
  publishedPostId: null,
};

const SOURCE_DETAIL: GetSourceResponse = {
  ...SOURCE_SUMMARY,
  content: '# Source note',
  embedding: null,
};

function buildMockHttpClient(
  overrides: MockHttpClientOverrides = {},
): HttpClient {
  return {
    get: vi.fn((path: string) => {
      if (path === '/sources') {
        return Promise.resolve({ sources: [SOURCE_SUMMARY] });
      }
      if (path === '/posts/count') {
        return Promise.resolve({ count: 0 });
      }
      if (path === '/posts' || path === '/posts/search') {
        return Promise.resolve({ posts: [], nextCursor: null });
      }
      return Promise.resolve(SOURCE_DETAIL);
    }),
    post: vi.fn(),
    patch: vi.fn(),
    ...overrides,
  } as unknown as HttpClient;
}

function renderApp(client: HttpClient, initialEntry = '/sources') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={createTestQueryClient()}>
        <HttpClientProvider client={client}>
          <App />
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('source 목록에서 상세 화면으로 이동한다', async () => {
    const user = userEvent.setup();
    const getSource = vi.fn().mockResolvedValue(SOURCE_DETAIL);
    const client = buildMockHttpClient({
      get: vi.fn((path: string) => {
        if (path === '/sources') {
          return Promise.resolve({ sources: [SOURCE_SUMMARY] });
        }
        return getSource(path) as Promise<unknown>;
      }),
    });

    renderApp(client);

    await user.click(
      await screen.findByRole('link', { name: 'Notes/source.md' }),
    );

    await waitFor(() => {
      expect(getSource).toHaveBeenCalledWith('/sources/source-1');
      expect(
        screen.getByRole('heading', { name: 'Notes/source.md' }),
      ).toBeDefined();
      expect(screen.getByText('# Source note')).toBeDefined();
    });
  });

  it('상세 화면에서 Back to sources 링크로 목록으로 돌아온다', async () => {
    const user = userEvent.setup();
    const client = buildMockHttpClient();

    renderApp(client, '/sources/source-1');

    await user.click(
      await screen.findByRole('link', { name: '← Back to sources' }),
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sources' })).toBeDefined();
    });
  });

  it('nav의 Posts 링크를 클릭하면 Posts 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    const client = buildMockHttpClient();

    renderApp(client);

    await user.click(screen.getByRole('link', { name: 'Posts' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'HASH' })).toBeDefined();
    });
  });

  it('nav의 Sources 링크를 클릭하면 Sources 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    const client = buildMockHttpClient();

    renderApp(client, '/sources/source-1');

    await user.click(screen.getByRole('link', { name: 'Sources' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sources' })).toBeDefined();
    });
  });
});
