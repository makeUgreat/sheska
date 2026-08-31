import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusMessage } from './status-message';

const meta = {
  title: 'Shared UI/StatusMessage',
  component: StatusMessage,
  tags: ['autodocs'],
  args: {
    tone: 'empty',
    children: 'No posts have been collected yet.',
  },
} satisfies Meta<typeof StatusMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Loading: Story = {
  args: {
    tone: 'loading',
    children: 'Loading posts',
  },
};

export const Error: Story = {
  args: {
    tone: 'error',
    children: 'Failed to load posts. Please try again.',
  },
};
