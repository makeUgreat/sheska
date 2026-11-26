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

export const Loading: Story = {
  name: '로딩 중에는 돌아가는 링크만 그리고 빈 상태나 오류를 그리지 않는다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: fn(() => new Promise(() => {})) })),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: '← sources' })).toBeDefined();
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
      await expect(canvas.getByText('note, e2e')).toBeDefined();
      await expect(canvas.getByRole('heading', { name: 'Source note', level: 2 })).toBeDefined();
      await expect(canvas.getByText('source-1')).toBeDefined();
      await expect(canvas.getByText('fingerprint-1')).toBeDefined();
      await expect(canvas.getByText('완료')).toBeDefined();
      await expect(canvas.getByText('4 청크')).toBeDefined();
      await expect(canvas.getByText('text-embedding-3-small · 1536d')).toBeDefined();
      await expect(canvas.getByRole('button', { name: 'Source 삭제' })).toBeDefined();
    });
  },
};

export const ProcessingProgress: Story = {
  name: 'sync job이 processing 상태이면 청크 진행을 렌더링한다',
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
      await expect(canvas.getByText('임베딩 중')).toBeDefined();
      await expect(canvas.getByText('3 / 10 · 30%')).toBeDefined();
      const progressbar = canvas.getByRole('progressbar', { name: '임베딩한 청크' });
      await expect(progressbar.getAttribute('aria-valuenow')).toBe('3');
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
      await expect(canvas.getByText('text-embedding-3-small · 1536d')).toBeDefined();
    });
  },
};

export const NoEmbeddingOrJob: Story = {
  name: 'embedding과 sync job이 없으면 빈 상태를 렌더링한다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: respondWith({ ...SOURCE, latestSyncJob: null, embedding: null }) })),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('기록 없음')).toBeDefined();
      await expect(canvas.queryByText('모델')).toBeNull();
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

const getPublishedSource = fn((path: string) =>
  Promise.resolve(path === '/posts/post-1' ? { ...POST, viewCount: 3 } : { ...SOURCE, publishedPostId: 'post-1' }),
);

export const PublishedSource: Story = {
  name: '게시된 source는 post를 읽어 조회수와 요약 상태를 보여 준다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ get: getPublishedSource })),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('3회')).toBeDefined();
      await expect(canvas.getByText('AI 요약 만드는 중')).toBeDefined();
      await expect(canvas.getByRole('link', { name: '포스트 보기' }).getAttribute('href')).toBe('/posts/post-1');
    });
  },
};
