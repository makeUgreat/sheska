import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './empty-state';

const listWidth: Decorator = (Story) => (
  <div className="w-screen max-w-measure">
    <Story />
  </div>
);

const meta = {
  title: 'Shared/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  decorators: [listWidth],
  args: {
    variant: 'list',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PostsList: Story = {};

export const SearchResults: Story = {
  args: { variant: 'search', query: 'generative ui' },
};

export const Document: Story = {
  args: { variant: 'document' },
};
