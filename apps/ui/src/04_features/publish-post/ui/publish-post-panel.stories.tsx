import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';
import { PublishPostPanel } from './publish-post-panel';

type HttpCall = (path: string, ...rest: unknown[]) => Promise<unknown>;

const NEVER_SETTLES = () => new Promise<never>(() => undefined);

const POST = {
  postId: 'post-1',
  sourceId: 'source-1',
  title: '테스트 포스트',
  viewCount: 128,
  summary: { status: 'ready', lines: ['요약 문장'] },
  createdAt: '2026-11-24T01:31:00.000Z',
  updatedAt: '2026-11-24T01:31:00.000Z',
  body: '본문',
};

function withHttp(overrides: { get?: HttpCall; post?: HttpCall; delete?: HttpCall } = {}) {
  const http = {
    get: fn<HttpCall>(() => Promise.resolve(POST)),
    post: fn<HttpCall>(() => Promise.resolve(POST)),
    delete: fn<HttpCall>(() => Promise.resolve(undefined)),
    ...overrides,
  } as unknown as HttpClient;

  return (Story: () => React.ReactElement) => (
    <HttpClientProvider client={http}>
      <Story />
    </HttpClientProvider>
  );
}

const meta = {
  title: 'Features/PublishPost/PublishPostPanel',
  component: PublishPostPanel,
  args: {
    sourceId: 'source-1',
    publishedPostId: null,
    syncCompleted: true,
  },
  decorators: [
    withHttp(),
    (Story) => (
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <div className="w-72">
            <Story />
          </div>
        </QueryClientProvider>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof PublishPostPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

async function askToUnpublish({ canvas, userEvent }: PlayContext) {
  await userEvent.click(await canvas.findByRole('button', { name: '게시 취소' }));
}

async function confirmUnpublish(context: PlayContext) {
  await askToUnpublish(context);
  await context.userEvent.click(context.canvas.getByRole('button', { name: '게시 취소하기' }));
}

export const Unpublished: Story = {};

export const UnpublishedWhileEmbedding: Story = {
  name: '임베딩이 끝나기 전이면 게시해도 된다고 알린다',
  tags: ['!dev'],
  args: { syncCompleted: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/임베딩이 끝나기 전에도 게시할 수 있습니다/)).toBeDefined();
    await expect(canvas.getByRole('button', { name: '게시하기' })).toBeDefined();
  },
};

const publishPost = fn<HttpCall>(() => Promise.resolve(POST));

export const PublishesBySourceId: Story = {
  name: '게시하기를 누르면 sourceId로 게시한다',
  tags: ['!dev'],
  decorators: [withHttp({ post: publishPost })],
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '게시하기' }));

    await waitFor(() => expect(publishPost).toHaveBeenCalledWith('/posts', { sourceId: 'source-1' }, expect.anything()));
  },
};

export const Publishing: Story = {
  name: '게시하는 동안 게시하기 버튼을 막는다',
  tags: ['!dev'],
  decorators: [withHttp({ post: NEVER_SETTLES })],
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '게시하기' }));

    await expect(await canvas.findByRole('button', { name: '게시하는 중...' })).toBeDisabled();
  },
};

export const JustPublished: Story = {
  name: '게시하면 게시됨 상태와 포스트 링크를 보여 준다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '게시하기' }));

    const link = await canvas.findByRole('link', { name: '포스트 보기' });
    await expect(link.getAttribute('href')).toBe('/posts/post-1');
    await expect(canvas.getByText('게시됨')).toBeDefined();
  },
};

export const PublishFailed: Story = {
  name: '게시하지 못하면 이유를 알린다',
  tags: ['!dev'],
  decorators: [withHttp({ post: () => Promise.reject(new HttpError(409, 'Conflict')) })],
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '게시하기' }));

    await expect((await canvas.findByRole('alert')).textContent).toContain('게시하지 못했습니다.');
  },
};

export const AlreadyPublished: Story = {
  name: '게시된 post의 조회수, 게시 시각, 요약 상태를 보여 준다',
  tags: ['!dev'],
  args: { publishedPostId: 'post-1' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('128회')).toBeDefined();
    await expect(canvas.getByText('AI 요약 완료')).toBeDefined();
    await expect(canvas.getByText('/posts/post-1')).toBeDefined();
    await expect(canvas.getByRole('button', { name: '포스트 주소 복사' })).toBeDefined();
  },
};

export const ConfirmingUnpublish: Story = {
  name: '게시 취소를 누르면 지워지는 것을 알리고 한 번 더 묻는다',
  tags: ['!dev'],
  args: { publishedPostId: 'post-1' },
  play: async (context) => {
    await askToUnpublish(context);

    const dialog = context.canvas.getByRole('alertdialog', { name: '게시를 취소할까요?' });
    await expect(dialog.textContent).toContain('되돌릴 수 없습니다');
    await expect(context.canvas.queryByRole('link', { name: '포스트 보기' })).toBeNull();
  },
};

export const CancelledUnpublish: Story = {
  name: '그만두기를 누르면 게시 취소를 묻기 전으로 돌아간다',
  tags: ['!dev'],
  args: { publishedPostId: 'post-1' },
  play: async (context) => {
    await askToUnpublish(context);
    await context.userEvent.click(context.canvas.getByRole('button', { name: '그만두기' }));

    await expect(context.canvas.queryByRole('alertdialog')).toBeNull();
    await expect(context.canvas.getByRole('link', { name: '포스트 보기' })).toBeDefined();
  },
};

export const Unpublishing: Story = {
  name: '게시를 취소하는 동안 두 버튼을 막는다',
  tags: ['!dev'],
  args: { publishedPostId: 'post-1' },
  decorators: [withHttp({ delete: NEVER_SETTLES })],
  play: async (context) => {
    await confirmUnpublish(context);

    await expect(await context.canvas.findByRole('button', { name: '취소하는 중...' })).toBeDisabled();
    await expect(context.canvas.getByRole('button', { name: '그만두기' })).toBeDisabled();
  },
};

const deletePost = fn<HttpCall>(() => Promise.resolve(undefined));

export const JustUnpublished: Story = {
  name: '게시를 취소하면 post를 지우고 다시 게시할 수 있게 한다',
  tags: ['!dev'],
  args: { publishedPostId: 'post-1' },
  decorators: [withHttp({ delete: deletePost })],
  play: async (context) => {
    await confirmUnpublish(context);

    await expect(await context.canvas.findByText(/게시를 취소했습니다/)).toBeDefined();
    await expect(deletePost).toHaveBeenCalledWith('/posts/post-1');
    await expect(context.canvas.getByRole('button', { name: '다시 게시하기' })).toBeDefined();
  },
};

export const UnpublishFailed: Story = {
  name: '게시를 취소하지 못하면 알리고 다시 시도하게 한다',
  tags: ['!dev'],
  args: { publishedPostId: 'post-1' },
  decorators: [withHttp({ delete: () => Promise.reject(new HttpError(503, 'Service Unavailable')) })],
  play: async (context) => {
    await confirmUnpublish(context);

    await expect((await context.canvas.findByRole('alert')).textContent).toContain('게시를 취소하지 못했습니다.');
    await expect(context.canvas.getByRole('button', { name: '다시 시도' })).toBeDefined();
  },
};
