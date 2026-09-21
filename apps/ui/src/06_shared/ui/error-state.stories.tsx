import type { Meta, StoryObj } from '@storybook/react-vite';
import { ErrorState } from './error-state';

const meta = {
  title: 'Shared UI/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  args: {
    error: new Error('Failed to load posts. Please try again.'),
  },
} satisfies Meta<typeof ErrorState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Failed: Story = {};

export const LongMessage: Story = {
  args: {
    error: new Error(
      'Request to /posts failed with status 500 after 3 retries. The upstream service did not respond in time.',
    ),
  },
};
