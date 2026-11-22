import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type GetSourceResponse } from '@/entities/source';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';
import { SourceDetailPage } from './source-detail-page';

type HttpCall = (path: string, ...rest: unknown[]) => Promise<unknown>;

const NOW = '2026-01-01T00:00:00.000Z';
const SOURCE: GetSourceResponse = {
  sourceId: 'source-1',
  externalSourceId: 'Notes/source.md',
  frontmatter: { tags: ['note', 'e2e'] },
  title: 'Source note',
  body: '# Source note',
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
  embedding: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    createdAt: NOW,
    updatedAt: NOW,
  },
  publishedPostId: null,
};

const POST = {
  postId: 'post-1',
  sourceId: 'source-1',
  title: '테스트 포스트',
  viewCount: 0,
  summary: { status: 'pending' },
  createdAt: NOW,
  updatedAt: NOW,
};

function respondWith(value: unknown) {
  return fn<HttpCall>(() => Promise.resolve(value));
}

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function buildStoryHttpClient(overrides: { get?: HttpCall; post?: HttpCall } = {}): HttpClient {
  return {
    get: respondWith(SOURCE),
    post: respondWith(POST),
    patch: fn(),
    ...overrides,
  } as unknown as HttpClient;
}

function withPage(client: HttpClient, sourceId = 'source-1') {
  return [
    (Story: () => React.ReactElement) => (
      <MemoryRouter initialEntries={[`/sources/${sourceId}`]}>
        <QueryClientProvider client={createTestQueryClient()}>
          <HttpClientProvider client={client}>
            <Routes>
              <Route path="/sources/:id" element={<Story />} />
            </Routes>
          </HttpClientProvider>
        </QueryClientProvider>
      </MemoryRouter>
    ),
  ];
}

const meta = {
  title: 'Pages/SourceDetail/SourceDetailPage',
  component: SourceDetailPage,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SourceDetailPage>;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

async function clickPublishOnceShown({ canvas, userEvent }: PlayContext) {
  await waitFor(() => canvas.getByRole('heading', { name: '게시하기' }));

  await userEvent.click(canvas.getByRole('button', { name: '게시하기' }));
}

export const Loading: Story = {
  name: '로딩 중에는 돌아가는 링크만 그리고 빈 상태나 오류를 그리지 않는다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: fn(() => new Promise(() => {})) })),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: '← Back to sources' })).toBeDefined();
    await expect(canvas.queryByText('Not found')).toBeNull();
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};

export const Details: Story = {
  name: 'source 상세 정보를 렌더링한다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient()),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByRole('heading', { name: 'Source note', level: 1 })).toBeDefined();
      await expect(canvas.getByText('Notes/source.md')).toBeDefined();
      await expect(canvas.getByText('tags')).toBeDefined();
      await expect(canvas.getByText('["note","e2e"]')).toBeDefined();
      await expect(canvas.getByRole('heading', { name: 'Source note', level: 2 })).toBeDefined();
      await expect(canvas.getByText('source-1')).toBeDefined();
      await expect(canvas.getByText('fingerprint-1')).toBeDefined();
      await expect(canvas.getByText('completed')).toBeDefined();
      await expect(canvas.getByText('sync-job-1')).toBeDefined();
      await expect(canvas.getByText('text-embedding-3-small')).toBeDefined();
      await expect(canvas.getByText('1536')).toBeDefined();
    });
  },
};

export const ProcessingProgress: Story = {
  name: 'sync job이 processing 상태이면 진행률을 렌더링한다',
  tags: ['!dev'],
  decorators: withPage(
    buildStoryHttpClient({
      get: fn((path: string) =>
        Promise.resolve(
          path.startsWith('/sync-jobs/')
            ? {
                syncJobId: 'sync-job-1',
                sourceId: 'source-1',
                fingerprint: 'fingerprint-1',
                status: 'processing',
                totalChunks: 10,
                processedChunks: 3,
                createdAt: NOW,
              }
            : {
                ...SOURCE,
                latestSyncJob: {
                  syncJobId: 'sync-job-1',
                  status: 'waiting',
                  totalChunks: 10,
                  createdAt: NOW,
                },
              },
        ),
      ),
    }),
  ),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('processing')).toBeDefined();
      await expect(canvas.getByText('3/10 (30%)')).toBeDefined();
      const progressbar = canvas.getByRole('progressbar');
      await expect(progressbar.getAttribute('aria-valuenow')).toBe('30');
    });
  },
};

const ACTIVE_SOURCE = {
  ...SOURCE,
  latestSyncJob: { ...SOURCE.latestSyncJob!, status: 'waiting' as const },
  embedding: null,
};
const pollSyncJob = fn((path: string) => {
  if (path === '/sync-jobs/sync-job-1') {
    return Promise.resolve({
      ...ACTIVE_SOURCE.latestSyncJob,
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'completed',
      processedChunks: 4,
    });
  }
  return Promise.resolve(pollSyncJob.mock.calls.filter(([calledPath]) => calledPath === path).length > 1 ? SOURCE : ACTIVE_SOURCE);
});

export const PollsActiveSyncJob: Story = {
  name: 'active sync job은 sync job API로 polling하고 완료 후 source를 갱신한다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: pollSyncJob })),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(pollSyncJob).toHaveBeenCalledWith('/sync-jobs/sync-job-1', expect.anything());
      await expect(pollSyncJob.mock.calls.filter(([path]) => path === '/sources/source-1').length).toBe(2);
      await expect(canvas.getByText('text-embedding-3-small')).toBeDefined();
    });
  },
};

export const NoEmbeddingOrJob: Story = {
  name: 'embedding과 sync job이 없으면 빈 상태를 렌더링한다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: respondWith({ ...SOURCE, latestSyncJob: null, embedding: null }) })),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('No job')).toBeDefined();
      await expect(canvas.getByText('Not yet generated')).toBeDefined();
    });
  },
};

export const LoadFailed: Story = {
  name: '에러가 발생하면 상태 코드와 실패한 대상을 보여준다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: fn(() => Promise.reject(new HttpError(503, 'Service Unavailable'))) })),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByRole('alert')).toBeDefined();
      await expect(canvas.getByText('503')).toBeDefined();
      await expect(canvas.getByText('Something went wrong while loading.')).toBeDefined();
    });
  },
};

export const NotFound: Story = {
  name: 'source가 없으면 빈 상태 메시지를 보여준다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: respondWith(null) })),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText('This page does not exist, or it was removed.')).toBeDefined());
  },
};

const getSourceById = respondWith(SOURCE);

export const RequestsById: Story = {
  name: 'getSource를 올바른 id로 호출한다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: getSourceById }), 'source-1'),
  play: async () => {
    await waitFor(() => expect(getSourceById).toHaveBeenCalledWith('/sources/source-1', expect.anything()));
  },
};

export const PublishButton: Story = {
  name: '게시하기 버튼이 렌더링된다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient()),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByRole('heading', { name: '게시하기' })).toBeDefined();
      await expect(canvas.getByRole('button', { name: '게시하기' })).toBeDefined();
    });
  },
};

export const Publishing: Story = {
  name: '게시 중이면 게시하기 버튼이 비활성화된다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ post: fn(() => new Promise(() => {})) })),
  play: async (context) => {
    const { canvas } = context;

    await clickPublishOnceShown(context);

    await waitFor(async () => {
      const button = canvas.getByRole('button', { name: '게시 중...' });
      await expect((button as HTMLButtonElement).disabled).toBe(true);
    });
  },
};

const publishPost = respondWith(POST);

export const PublishesBySourceId: Story = {
  name: '게시하기 클릭 시 publishPost가 sourceId로 호출된다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ post: publishPost })),
  play: async (context) => {
    await clickPublishOnceShown(context);

    await waitFor(() => expect(publishPost).toHaveBeenCalledWith('/posts', { sourceId: 'source-1' }, expect.anything()));
  },
};

export const Published: Story = {
  name: '게시 성공 시 성공 메시지와 게시된 포스트 링크가 표시된다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient()),
  play: async (context) => {
    const { canvas } = context;

    await clickPublishOnceShown(context);

    await waitFor(async () => {
      await expect(canvas.getByText(/포스트가 게시되었습니다/)).toBeDefined();
      const link = canvas.getByRole('link', { name: '게시된 포스트 보기' });
      await expect(link).toBeDefined();
      await expect(link.getAttribute('href')).toBe('/posts/post-1');
    });
  },
};

const getSourceThenPublished = fn(() =>
  Promise.resolve(getSourceThenPublished.mock.calls.length === 1 ? SOURCE : { ...SOURCE, publishedPostId: 'post-1' }),
);

export const PublishedThenRefetched: Story = {
  name: '게시 성공 후 source를 다시 불러와도 안내 문구는 하나만 표시된다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: getSourceThenPublished })),
  play: async (context) => {
    const { canvas } = context;

    await clickPublishOnceShown(context);

    await waitFor(() => expect(getSourceThenPublished).toHaveBeenCalledTimes(2));
    await expect(canvas.getAllByRole('link', { name: '게시된 포스트 보기' })).toHaveLength(1);
    await expect(canvas.queryByText(/이미 게시되었습니다/)).toBeNull();
  },
};

export const AlreadyPublished: Story = {
  name: '이미 게시된 source는 게시하기 버튼 대신 게시된 포스트 링크를 보여준다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: respondWith({ ...SOURCE, publishedPostId: 'post-1' }) })),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      const link = canvas.getByRole('link', { name: '게시된 포스트 보기' });
      await expect(link).toBeDefined();
      await expect(link.getAttribute('href')).toBe('/posts/post-1');
      await expect(canvas.queryByRole('button', { name: '게시하기' })).toBeNull();
    });
  },
};

export const PublishFailed: Story = {
  name: '게시 실패 시 에러 메시지가 표시된다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ post: fn(() => Promise.reject(new Error('이미 게시된 포스트가 있습니다'))) })),
  play: async (context) => {
    const { canvas } = context;

    await clickPublishOnceShown(context);

    await waitFor(async () => {
      await expect(canvas.getByRole('alert')).toBeDefined();
      await expect(canvas.getByText('오류: 이미 게시된 포스트가 있습니다')).toBeDefined();
    });
  },
};
