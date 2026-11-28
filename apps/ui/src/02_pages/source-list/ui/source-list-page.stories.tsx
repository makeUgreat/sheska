import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type SourceSummary } from '@/entities/source';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';
import { SourceListPage } from './source-list-page';

const NOW = '2026-01-01T00:00:00.000Z';
const NO_SOURCES = {
  sources: [],
  page: 1,
  pageSize: 10,
  totalCount: 0,
  totalPages: 0,
};

function respondWith(value: unknown) {
  return fn(() => Promise.resolve(value));
}

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function buildStoryHttpClient(overrides: { get?: (...args: unknown[]) => Promise<unknown> } = {}): HttpClient {
  return {
    get: respondWith(NO_SOURCES),
    post: fn(),
    patch: fn(),
    ...overrides,
  } as unknown as HttpClient;
}

function withPage(client: HttpClient, queryClient?: QueryClient) {
  return [
    (Story: () => React.ReactElement) => (
      <MemoryRouter>
        <QueryClientProvider client={queryClient ?? createTestQueryClient()}>
          <HttpClientProvider client={client}>
            <Story />
          </HttpClientProvider>
        </QueryClientProvider>
      </MemoryRouter>
    ),
  ];
}

function listing(source: SourceSummary) {
  return withPage(
    buildStoryHttpClient({
      get: respondWith({
        sources: [source],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      }),
    }),
  );
}

const meta = {
  title: 'Pages/SourceList/SourceListPage',
  component: SourceListPage,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SourceListPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WaitingForList: Story = {
  name: '목록을 기다리는 동안 빈 상태를 그리지 않는다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: fn(() => new Promise(() => {})) })),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Sources' })).toBeDefined();
    await expect(canvas.queryByText('Empty')).toBeNull();
  },
};

export const EmptyList: Story = {
  name: 'source 목록이 없으면 빈 상태 메시지를 보여준다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: respondWith(NO_SOURCES) })),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText('Empty')).toBeDefined());
  },
};

export const LinksToDetail: Story = {
  name: 'source 목록과 상세 링크를 렌더링한다',
  tags: ['!dev'],
  decorators: listing({
    sourceId: 'source-1',
    externalSourceId: 'Notes/source.md',
    title: 'Source Title',
    fingerprint: 'fingerprint-1',
    sizeBytes: 14,
    createdAt: NOW,
    updatedAt: NOW,
    latestSyncJob: {
      syncJobId: 'sync-job-1',
      status: 'completed',
      totalChunks: 4,
      createdAt: NOW,
    },
    publishedPostId: null,
  }),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      const link = canvas.getByRole('link', { name: 'Source Title' });
      await expect(link).toBeDefined();
      await expect(link.getAttribute('href')).toBe('/sources/source-1');
      await expect(within(canvas.getByRole('list')).getByText('completed')).toBeDefined();
      await expect(canvas.getByText(/0\.1 KB/)).toBeDefined();
    });
  },
};

export const WaitingSyncJob: Story = {
  name: 'sync job이 waiting 상태이면 진행률 없이 상태만 보여준다',
  tags: ['!dev'],
  decorators: listing({
    sourceId: 'source-1',
    externalSourceId: 'Notes/source.md',
    title: 'Source Title',
    fingerprint: 'fingerprint-1',
    sizeBytes: 14,
    createdAt: NOW,
    updatedAt: NOW,
    latestSyncJob: {
      syncJobId: 'sync-job-1',
      status: 'waiting',
      totalChunks: 10,
      createdAt: NOW,
    },
    publishedPostId: null,
  }),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(within(canvas.getByRole('list')).getByText('waiting')).toBeDefined();
      await expect(canvas.queryByRole('progressbar')).toBeNull();
    });
  },
};

export const PublishedBadge: Story = {
  name: '게시된 source는 게시됨 배지를 보여준다',
  tags: ['!dev'],
  decorators: listing({
    sourceId: 'source-1',
    externalSourceId: 'Notes/source.md',
    title: 'Source Title',
    fingerprint: 'fingerprint-1',
    sizeBytes: 14,
    createdAt: NOW,
    updatedAt: NOW,
    latestSyncJob: null,
    publishedPostId: 'post-1',
  }),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText('게시됨')).toBeDefined());
  },
};

export const UnpublishedNoBadge: Story = {
  name: '게시되지 않은 source는 게시됨 배지를 보여주지 않는다',
  tags: ['!dev'],
  decorators: listing({
    sourceId: 'source-1',
    externalSourceId: 'Notes/source.md',
    title: 'Source Title',
    fingerprint: 'fingerprint-1',
    sizeBytes: 14,
    createdAt: NOW,
    updatedAt: NOW,
    latestSyncJob: null,
    publishedPostId: null,
  }),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('link', { name: 'Source Title' })).toBeDefined());

    await expect(canvas.queryByText('게시됨')).toBeNull();
  },
};

const refetchedSources = respondWith({
  sources: [
    {
      sourceId: 'source-1',
      externalSourceId: 'Notes/source.md',
      title: 'Source Title',
      fingerprint: 'fingerprint-1',
      sizeBytes: 14,
      createdAt: NOW,
      updatedAt: NOW,
      latestSyncJob: {
        syncJobId: 'sync-job-1',
        status: 'waiting',
        totalChunks: 10,
        createdAt: NOW,
      },
      publishedPostId: null,
    },
  ],
  page: 1,
  pageSize: 10,
  totalCount: 12,
  totalPages: 2,
});
const refetchingQueryClient = createTestQueryClient();

export const BackgroundRefetch: Story = {
  name: '백그라운드 재조회 중에는 목록을 흐리게 하거나 페이지 이동을 막지 않는다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: refetchedSources }), refetchingQueryClient),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('link', { name: 'Source Title' })).toBeDefined());

    refetchedSources.mockReturnValueOnce(new Promise(() => {}));
    void refetchingQueryClient.refetchQueries({ queryKey: ['sources', 'list'] });
    await waitFor(() => expect(refetchedSources).toHaveBeenCalledTimes(2));

    await expect(canvas.getByRole('list').className).not.toContain('opacity-40');
    const nextButton = canvas.getByRole('button', { name: 'Next' });
    await expect((nextButton as HTMLButtonElement).disabled).toBe(false);
  },
};

export const LoadFailed: Story = {
  name: '에러가 발생하면 상태 코드와 실패한 대상을 보여준다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: fn(() => Promise.reject(new HttpError(500, 'Internal Server Error'))) })),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByRole('alert')).toBeDefined();
      await expect(canvas.getByText('500')).toBeDefined();
      await expect(canvas.getByText('Something went wrong while loading.')).toBeDefined();
    });
  },
};

const SOURCE_PAGES = [
  {
    sources: [
      {
        sourceId: 'source-1',
        externalSourceId: 'Notes/first.md',
        title: 'First Title',
        fingerprint: 'fingerprint-1',
        sizeBytes: 14,
        createdAt: NOW,
        updatedAt: NOW,
        latestSyncJob: null,
        publishedPostId: null,
      },
    ],
    page: 1,
    pageSize: 10,
    totalCount: 2,
    totalPages: 2,
  },
  {
    sources: [
      {
        sourceId: 'source-2',
        externalSourceId: 'Notes/second.md',
        title: 'Second Title',
        fingerprint: 'fingerprint-2',
        sizeBytes: 15,
        createdAt: NOW,
        updatedAt: NOW,
        latestSyncJob: null,
        publishedPostId: null,
      },
    ],
    page: 2,
    pageSize: 10,
    totalCount: 2,
    totalPages: 2,
  },
];
const getSourcePages = fn(() => Promise.resolve(SOURCE_PAGES[getSourcePages.mock.calls.length - 1]));

export const NextPage: Story = {
  name: '페이지네이션 버튼을 클릭하면 다음 페이지의 source를 불러온다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: getSourcePages })),
  play: async ({ canvas, userEvent }) => {
    await waitFor(() => expect(canvas.getByRole('link', { name: 'First Title' })).toBeDefined());

    await userEvent.click(canvas.getByRole('button', { name: '2' }));
    await waitFor(() => expect(canvas.getByRole('link', { name: 'Second Title' })).toBeDefined());
    await expect(getSourcePages).toHaveBeenNthCalledWith(1, '/sources', expect.anything(), { page: '1' });
    await expect(getSourcePages).toHaveBeenNthCalledWith(2, '/sources', expect.anything(), { page: '2' });
  },
};
