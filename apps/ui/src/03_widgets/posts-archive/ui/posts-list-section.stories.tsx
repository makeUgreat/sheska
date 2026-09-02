import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { type PostSummary } from '@/entities/post';
import { PostsListSection } from './posts-list-section';

const samplePosts: PostSummary[] = [
  {
    postId: 'post-storybook-intro',
    sourceId: 'source-storybook-intro',
    title: 'Introducing Storybook to the Sheska UI',
    viewCount: 342,
    createdAt: '2026-08-05T08:30:00.000Z',
    updatedAt: '2026-08-05T09:30:00.000Z',
  },
  {
    postId: 'post-visual-fixtures',
    sourceId: 'source-visual-fixtures',
    title: 'Using UI State Fixtures for Component Review',
    viewCount: 91,
    createdAt: '2026-08-04T08:30:00.000Z',
    updatedAt: '2026-08-04T09:30:00.000Z',
  },
  {
    postId: 'post-long-title',
    sourceId: 'source-long-title',
    title:
      'A deliberately long archive title that should wrap cleanly inside the post list section',
    viewCount: 1_208,
    createdAt: '2026-08-03T08:30:00.000Z',
    updatedAt: '2026-08-03T09:30:00.000Z',
  },
];

const meta = {
  title: 'Features/Posts/PostsListSection',
  component: PostsListSection,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    search: {
      query: '',
      onQueryChange: () => undefined,
      onQuerySubmit: () => undefined,
      normalizedQuery: '',
      mode: null,
    },
    state: {
      status: 'success',
      posts: samplePosts,
      hasNextPage: false,
      isFetchingNextPage: false,
      sentinelRef: null,
    },
  },
} satisfies Meta<typeof PostsListSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Populated: Story = {};

export const Loading: Story = {
  args: {
    state: {
      status: 'loading',
    },
  },
};

export const Empty: Story = {
  args: {
    state: {
      status: 'empty',
    },
  },
};

export const NoSearchResults: Story = {
  args: {
    search: {
      query: 'missing',
      onQueryChange: () => undefined,
      onQuerySubmit: () => undefined,
      normalizedQuery: 'missing',
      mode: 'smart',
    },
    state: {
      status: 'empty',
    },
  },
};

export const SmartSearch: Story = {
  args: {
    search: {
      query: 'storybook',
      onQueryChange: () => undefined,
      onQuerySubmit: () => undefined,
      normalizedQuery: 'storybook',
      mode: 'smart',
    },
  },
};

export const BasicSearchFallback: Story = {
  args: {
    search: {
      query: 'storybook',
      onQueryChange: () => undefined,
      onQuerySubmit: () => undefined,
      normalizedQuery: 'storybook',
      mode: 'basic',
    },
  },
};

export const ErrorState: Story = {
  args: {
    state: {
      status: 'error',
      error: new Error('Failed to load posts.'),
    },
  },
};

export const FetchingNextPage: Story = {
  args: {
    state: {
      status: 'success',
      posts: samplePosts,
      hasNextPage: true,
      isFetchingNextPage: true,
      sentinelRef: null,
    },
  },
};
