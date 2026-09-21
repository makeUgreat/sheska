import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './empty-state';

const meta = {
  title: 'Shared UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: {
    label: 'No posts yet.',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Posts: Story = {};

export const SearchResults: Story = {
  args: {
    label: 'No results for "terminal".',
  },
};

export const WithArchiveSpacing: Story = {
  args: {
    className: 'mt-16 pt-12',
  },
};
