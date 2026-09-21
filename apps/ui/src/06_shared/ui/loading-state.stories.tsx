import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadingState } from './loading-state';

const meta = {
  title: 'Shared UI/LoadingState',
  component: LoadingState,
  tags: ['autodocs'],
} satisfies Meta<typeof LoadingState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

export const WithArchiveSpacing: Story = {
  args: {
    className: 'mt-16 pt-12',
  },
};
