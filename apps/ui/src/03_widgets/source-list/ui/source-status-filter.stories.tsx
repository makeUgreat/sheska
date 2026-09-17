import type { Meta, StoryObj } from '@storybook/react-vite';
import { SourceStatusFilter } from './source-status-filter';

const meta = {
  title: 'Features/Sources/SourceStatusFilter',
  component: SourceStatusFilter,
  tags: ['autodocs'],
  args: {
    value: undefined,
    onChange: () => undefined,
  },
} satisfies Meta<typeof SourceStatusFilter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllSelected: Story = {};

export const WaitingSelected: Story = {
  args: {
    value: 'waiting',
  },
};

export const FailedSelected: Story = {
  args: {
    value: 'failed',
  },
};
