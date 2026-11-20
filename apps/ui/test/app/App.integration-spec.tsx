import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type GetSourceResponse, type SourceSummary } from '@/entities/source';
import { App } from '@/app/shell';
import { HttpClientProvider, type HttpClientType as HttpClient } from '@/shared/api';

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
  title: 'Source note',
  fingerprint: 'fingerprint-1',
  sizeBytes: 14,
  createdAt: NOW,
  updatedAt: NOW,
  latestSyncJob: null,
  publishedPostId: null,
};

const SOURCE_DETAIL: GetSourceResponse = {
  ...SOURCE_SUMMARY,
  frontmatter: {},
  title: 'Source note',
  body: '# Source note',
  embedding: null,
};

function buildMockHttpClient(
  overrides: MockHttpClientOverrides = {},
  { authenticated = true }: { authenticated?: boolean } = {},
): HttpClient {
  let loggedIn = authenticated;
  return {
    get: vi.fn((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({ authenticated: loggedIn });
      }
      if (path === '/sources') {
        return Promise.resolve({
          sources: [SOURCE_SUMMARY],
          page: 1,
          pageSize: 10,
          totalCount: 1,
          totalPages: 1,
        });
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
    delete: vi.fn(() => {
      loggedIn = false;
      return Promise.resolve();
    }),
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
          return Promise.resolve({
            sources: [SOURCE_SUMMARY],
            page: 1,
            pageSize: 10,
            totalCount: 1,
            totalPages: 1,
          });
        }
        return getSource(path) as Promise<unknown>;
      }),
    });

    renderApp(client);

    await user.click(await screen.findByRole('link', { name: 'Source note' }));

    await waitFor(() => {
      expect(getSource).toHaveBeenCalledWith('/sources/source-1');
      expect(screen.getByRole('heading', { name: 'Source note', level: 1 })).toBeDefined();
    });
  });

  it('상세 화면에서 Back to sources 링크로 목록으로 돌아온다', async () => {
    const user = userEvent.setup();
    const client = buildMockHttpClient();

    renderApp(client, '/sources/source-1');

    await user.click(await screen.findByRole('link', { name: '← Back to sources' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sources' })).toBeDefined();
    });
  });

  it('landing hero의 posts 링크는 리로드 없이 Posts 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    const client = buildMockHttpClient();

    renderApp(client, '/');

    await user.click(screen.getByRole('link', { name: 'posts' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Posts' })).toBeDefined();
    });
  });

  it('post 목록을 기다리는 동안 header가 Loading을 알린다', async () => {
    const client = buildMockHttpClient({
      get: vi.fn((path: string) => (path === '/auth/session' ? Promise.resolve({ authenticated: false }) : new Promise(() => {}))),
    });

    renderApp(client, '/posts');

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('Loading');
    });
  });

  it('header nav의 posts 링크를 클릭하면 Posts 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    const client = buildMockHttpClient();

    renderApp(client);

    await user.click(screen.getByRole('link', { name: 'posts' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Posts' })).toBeDefined();
    });
  });

  it('header nav의 sources 링크를 클릭하면 Sources 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    const client = buildMockHttpClient();

    renderApp(client, '/sources/source-1');

    await user.click(await screen.findByRole('link', { name: 'sources' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sources' })).toBeDefined();
    });
  });

  describe('header', () => {
    it('방문자에게는 sources 메뉴를 보이지 않는다', async () => {
      const client = buildMockHttpClient({}, { authenticated: false });

      renderApp(client, '/posts');

      // 프롬프트는 누구(guest@hash)와 위치(:~$)를 나눠 그린다.
      expect(await screen.findByText('guest@hash')).toBeDefined();
      expect(screen.getByText('open ~/posts')).toBeDefined();
      expect(screen.queryByRole('link', { name: 'sources' })).toBeNull();
    });

    it('방문자가 노란 점을 누르면 메인 터미널에서 su를 실행한다', async () => {
      const user = userEvent.setup();
      const client = buildMockHttpClient({}, { authenticated: false });

      renderApp(client, '/posts');
      await user.click(await screen.findByRole('button', { name: 'Log in' }));

      expect(await screen.findByLabelText('Password:')).toBeDefined();
    });

    it('소유자가 노란 점을 누르면 로그아웃하고 sources 화면을 떠난다', async () => {
      const user = userEvent.setup();
      const client = buildMockHttpClient();

      renderApp(client, '/sources');
      await user.click(await screen.findByRole('button', { name: 'Log out' }));

      expect(client.delete).toHaveBeenCalledWith('/auth/session');
      expect(await screen.findByLabelText('guest@hash:~$')).toBeDefined();
    });
  });
});
