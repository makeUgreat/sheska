import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { type PostSummary } from '@/entities/post';
import { PostCard } from './post-card';

const samplePost: PostSummary = {
  postId: 'post-storybook-intro',
  sourceId: 'source-storybook-intro',
  title: 'Introducing Storybook to the Sheska UI',
  viewCount: 342,
  createdAt: '2026-08-05T08:30:00.000Z',
  updatedAt: '2026-08-05T09:30:00.000Z',
};

const meta = {
  title: 'Features/Posts/PostCard',
  component: PostCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="w-full max-w-[720px] px-6">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    post: samplePost,
  },
} satisfies Meta<typeof PostCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Highlighted: Story = {
  args: {
    highlight: 'Storybook',
  },
};

export const LongTitle: Story = {
  args: {
    post: {
      ...samplePost,
      title:
        'A long post title that should remain readable when the archive card wraps across multiple lines',
    },
  },
};
