import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './empty-state';

const meta = {
  title: 'Shared UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: {
    variant: 'grid',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NotesGrid: Story = {};

export const PostsList: Story = {
  args: { variant: 'list' },
};

export const SearchResults: Story = {
  args: { variant: 'search', query: 'generative ui' },
};

export const Document: Story = {
  args: { variant: 'document' },
};

export const WithArchiveSpacing: Story = {
  args: { className: 'mt-16 pt-12' },
};
