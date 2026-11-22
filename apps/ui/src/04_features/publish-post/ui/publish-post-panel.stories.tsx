import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';
import { PublishPostPanel } from './publish-post-panel';

const NEVER_SETTLES = () => new Promise<never>(() => undefined);

function respondToPublish(post: () => Promise<unknown>) {
  const http = { post } as unknown as HttpClient;

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
  },
  decorators: [
    respondToPublish(NEVER_SETTLES),
    (Story) => (
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
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

const clickPublish: Story['play'] = async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole('button', { name: '게시하기' }));
};

export const Unpublished: Story = {};

export const AlreadyPublished: Story = {
  args: { publishedPostId: 'post-1' },
};

export const Publishing: Story = {
  play: clickPublish,
};

export const JustPublished: Story = {
  decorators: [respondToPublish(() => Promise.resolve({ postId: 'post-1' }))],
  play: clickPublish,
};

export const Failed: Story = {
  decorators: [respondToPublish(() => Promise.reject(new HttpError(409, 'Conflict')))],
  play: clickPublish,
};
