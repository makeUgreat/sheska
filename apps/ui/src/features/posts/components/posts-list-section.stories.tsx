import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { type PostSummary } from '@/entities/posts/api/types';
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
    query: '',
    onQueryChange: () => undefined,
    isLoading: false,
    error: null,
    posts: samplePosts,
    isSearching: false,
    normalizedQuery: '',
    hasNextPage: false,
    isFetchingNextPage: false,
    sentinelRef: null,
  },
} satisfies Meta<typeof PostsListSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Populated: Story = {};

export const Loading: Story = {
  args: {
    isLoading: true,
    posts: [],
  },
};

export const Empty: Story = {
  args: {
    posts: [],
  },
};

export const NoSearchResults: Story = {
  args: {
    query: 'missing',
    posts: [],
    isSearching: true,
    normalizedQuery: 'missing',
  },
};

export const ErrorState: Story = {
  args: {
    error: new Error('Failed to load posts.'),
    posts: [],
  },
};

export const FetchingNextPage: Story = {
  args: {
    hasNextPage: true,
    isFetchingNextPage: true,
  },
};
