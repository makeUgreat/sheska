import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type GetSourceResponse, type SourceSummary } from '@/entities/source';
import { HttpClientProvider, type HttpClientType as HttpClient } from '@/shared/api';
import { routes } from '../model/routes';

type HttpCall = (path: string, ...rest: unknown[]) => Promise<unknown>;
type Router = ReturnType<typeof createMemoryRouter>;

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

const SOURCE_LIST = {
  sources: [SOURCE_SUMMARY],
  page: 1,
  pageSize: 10,
  totalCount: 1,
  totalPages: 1,
};

/**
 * 문서 높이를 route와 상관없이 고정해, 짧은 화면에서 브라우저가 scroll 위치를 잘라 내지 않게 한다.
 * grid의 auto 행이 늘어나 App 바탕도 같이 길어지므로 sticky header가 화면에 남는다.
 */
const SCROLLABLE_HEIGHT = 5000;
const LEAVING_SCROLL_Y = 1500;

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function buildStoryHttpClient(
  overrides: { get?: HttpCall } = {},
  { authenticated = true, deleteSpy = fn<HttpCall>(() => Promise.resolve()) }: { authenticated?: boolean; deleteSpy?: HttpCall } = {},
): HttpClient {
  let loggedIn = authenticated;
  return {
    get: fn((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({ authenticated: loggedIn });
      }
      if (path === '/sources') {
        return Promise.resolve(SOURCE_LIST);
      }
      if (path === '/posts/count') {
        return Promise.resolve({ count: 0 });
      }
      if (path === '/posts' || path === '/posts/search') {
        return Promise.resolve({ posts: [], nextCursor: null });
      }
      return Promise.resolve(SOURCE_DETAIL);
    }),
    post: fn(),
    patch: fn(),
    delete: (path: string) => {
      loggedIn = false;
      return deleteSpy(path);
    },
    ...overrides,
  } as unknown as HttpClient;
}

function StoryApp({ client, initialEntry, onRouter }: { client: HttpClient; initialEntry: string; onRouter?: (router: Router) => void }) {
  const [router] = useState(() => {
    const created = createMemoryRouter(routes, { initialEntries: [initialEntry] });
    onRouter?.(created);
    return created;
  });
  const [queryClient] = useState(createTestQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <HttpClientProvider client={client}>
        <RouterProvider router={router} />
      </HttpClientProvider>
    </QueryClientProvider>
  );
}

function appAt(initialEntry: string, client: HttpClient = buildStoryHttpClient()): Pick<Story, 'render'> {
  return { render: () => <StoryApp client={client} initialEntry={initialEntry} /> };
}

/** scroll 위치를 재려면 문서가 화면보다 길어야 한다. play가 뒤로 가기를 하도록 router를 넘긴다. */
function scrollableAppAt(initialEntry: string) {
  const rendered: { router?: Router } = {};
  const client = buildStoryHttpClient();
  const render = () => (
    <div style={{ display: 'grid', minHeight: SCROLLABLE_HEIGHT }}>
      <StoryApp
        client={client}
        initialEntry={initialEntry}
        onRouter={(router) => {
          rendered.router = router;
        }}
      />
    </div>
  );
  return { rendered, render };
}

const meta = {
  title: 'App/Shell/App',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const getSource = fn<HttpCall>(() => Promise.resolve(SOURCE_DETAIL));

export const SourceListToDetail: Story = {
  name: 'source 목록에서 상세 화면으로 이동한다',
  tags: ['!dev'],
  ...appAt(
    '/sources',
    buildStoryHttpClient({
      get: fn((path: string) => {
        if (path === '/sources') {
          return Promise.resolve(SOURCE_LIST);
        }
        return getSource(path);
      }),
    }),
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('link', { name: 'Source note' }));

    await waitFor(async () => {
      await expect(getSource).toHaveBeenCalledWith('/sources/source-1');
      await expect(canvas.getByRole('heading', { name: 'Source note', level: 1 })).toBeDefined();
    });
  },
};

export const DetailBackToSources: Story = {
  name: '상세 화면에서 Back to sources 링크로 목록으로 돌아온다',
  tags: ['!dev'],
  ...appAt('/sources/source-1'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('link', { name: '← Back to sources' }));

    await waitFor(() => expect(canvas.getByRole('heading', { name: 'Sources' })).toBeDefined());
  },
};

export const LandingPostsLink: Story = {
  name: 'landing hero의 posts 링크는 리로드 없이 Posts 페이지로 이동한다',
  tags: ['!dev'],
  ...appAt('/'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('link', { name: 'posts' }));

    await waitFor(() => expect(canvas.getByRole('heading', { level: 1, name: 'Posts' })).toBeDefined());
  },
};

export const HeaderLoading: Story = {
  name: 'post 목록을 기다리는 동안 header가 Loading을 알린다',
  tags: ['!dev'],
  ...appAt(
    '/posts',
    buildStoryHttpClient({
      get: fn((path: string) => (path === '/auth/session' ? Promise.resolve({ authenticated: false }) : new Promise(() => {}))),
    }),
  ),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('status').textContent).toBe('Loading'));
  },
};

export const HeaderPostsLink: Story = {
  name: 'header nav의 posts 링크를 클릭하면 Posts 페이지로 이동한다',
  tags: ['!dev'],
  ...appAt('/sources'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('link', { name: 'posts' }));

    await waitFor(() => expect(canvas.getByRole('heading', { level: 1, name: 'Posts' })).toBeDefined());
  },
};

export const HeaderSourcesLink: Story = {
  name: 'header nav의 sources 링크를 클릭하면 Sources 페이지로 이동한다',
  tags: ['!dev'],
  ...appAt('/sources/source-1'),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('link', { name: 'sources' }));

    await waitFor(() => expect(canvas.getByRole('heading', { name: 'Sources' })).toBeDefined());
  },
};

export const GuestHeader: Story = {
  name: '방문자에게는 sources 메뉴를 보이지 않는다',
  tags: ['!dev'],
  ...appAt('/posts', buildStoryHttpClient({}, { authenticated: false })),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('guest@hash')).toBeDefined();
    await expect(canvas.getByText('open ~/posts')).toBeDefined();
    await expect(canvas.queryByRole('link', { name: 'sources' })).toBeNull();
  },
};

export const GuestLogIn: Story = {
  name: '방문자가 노란 점을 누르면 메인 터미널에서 su를 실행한다',
  tags: ['!dev'],
  ...appAt('/posts', buildStoryHttpClient({}, { authenticated: false })),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Log in' }));

    await expect(await canvas.findByLabelText('Password:')).toBeDefined();
  },
};

const ownerDelete = fn<HttpCall>(() => Promise.resolve());

export const OwnerLogOut: Story = {
  name: '소유자가 노란 점을 누르면 로그아웃하고 sources 화면을 떠난다',
  tags: ['!dev'],
  ...appAt('/sources', buildStoryHttpClient({}, { deleteSpy: ownerDelete })),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Log out' }));

    await expect(ownerDelete).toHaveBeenCalledWith('/auth/session');
    await expect(await canvas.findByLabelText('guest@hash:~$')).toBeDefined();
  },
};

const newPageScroll = scrollableAppAt('/sources');

export const NewPageStartsAtTop: Story = {
  name: '다른 페이지로 이동하면 맨 위에서 시작한다',
  tags: ['!dev'],
  render: newPageScroll.render,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('link', { name: 'Source note' });
    window.scrollTo(0, LEAVING_SCROLL_Y);
    await expect(window.scrollY).toBe(LEAVING_SCROLL_Y);

    await userEvent.click(canvas.getByRole('link', { name: 'posts' }));

    await waitFor(() => expect(window.scrollY).toBe(0));
  },
};

const backScroll = scrollableAppAt('/sources');

export const BackRestoresScroll: Story = {
  name: '뒤로 가면 떠날 때의 위치로 돌아간다',
  tags: ['!dev'],
  render: backScroll.render,
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('link', { name: 'Source note' });
    window.scrollTo(0, LEAVING_SCROLL_Y);

    await userEvent.click(canvas.getByRole('link', { name: 'posts' }));
    await waitFor(() => expect(window.scrollY).toBe(0));

    const { router } = backScroll.rendered;
    if (!router) throw new Error('the app router is not rendered');
    await router.navigate(-1);
    await waitFor(() => expect(window.scrollY).toBe(LEAVING_SCROLL_Y));
  },
};
