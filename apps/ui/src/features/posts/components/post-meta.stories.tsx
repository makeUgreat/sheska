import type { Meta, StoryObj } from '@storybook/react-vite';
import { PostMeta } from './post-meta';

const meta = {
  title: 'Features/Posts/PostMeta',
  component: PostMeta,
  tags: ['autodocs'],
  args: {
    updatedAt: '2026-08-05T09:30:00.000Z',
    viewCount: 128,
  },
} satisfies Meta<typeof PostMeta>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HighViewCount: Story = {
  args: {
    viewCount: 128_400,
  },
};
