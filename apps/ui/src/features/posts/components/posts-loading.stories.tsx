import type { Meta, StoryObj } from '@storybook/react-vite';
import { EndOfPosts, PostsLoading } from './posts-loading';

const meta = {
  title: 'Features/Posts/PostsLoading',
  component: PostsLoading,
  tags: ['autodocs'],
  args: {
    label: 'Loading more posts...',
  },
} satisfies Meta<typeof PostsLoading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

export const InitialLoading: Story = {
  args: {
    label: 'Loading posts...',
  },
};

export const End: Story = {
  render: () => <EndOfPosts />,
};
