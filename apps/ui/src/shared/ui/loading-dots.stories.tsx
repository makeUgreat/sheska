import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadingDots } from './loading-dots';

const meta = {
  title: 'Shared UI/LoadingDots',
  component: LoadingDots,
  tags: ['autodocs'],
} satisfies Meta<typeof LoadingDots>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
