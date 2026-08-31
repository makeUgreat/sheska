import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tag } from './tag';

const meta = {
  title: 'Shared UI/Tag',
  component: Tag,
  tags: ['autodocs'],
  args: {
    children: 'Source',
  },
} satisfies Meta<typeof Tag>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Accent: Story = {};

export const Muted: Story = {
  args: {
    tone: 'muted',
    children: 'Archived',
  },
};
