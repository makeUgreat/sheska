import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PostsLandingView } from './posts-landing-view';

const meta = {
  title: 'Features/Posts/PostsLandingView',
  component: PostsLandingView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => {
    const [query, setQuery] = useState(args.query);

    return (
      <PostsLandingView {...args} query={query} onQueryChange={setQuery} />
    );
  },
  args: {
    query: '',
    onQueryChange: () => undefined,
    totalPostCount: 42,
  },
} satisfies Meta<typeof PostsLandingView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSearchQuery: Story = {
  args: {
    query: 'storybook',
  },
};
