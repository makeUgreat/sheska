import type { Meta, StoryObj } from '@storybook/react-vite';
import { EndOfList } from './end-of-list';

const meta = {
  title: 'Shared UI/EndOfList',
  component: EndOfList,
  tags: ['autodocs'],
  args: {
    label: 'End of notes',
  },
} satisfies Meta<typeof EndOfList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Notes: Story = {};

export const Posts: Story = {
  args: {
    label: 'End of posts',
  },
};
