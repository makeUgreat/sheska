import type { Meta, StoryObj } from '@storybook/react-vite';
import { EndOfList } from './end-of-list';

const meta = {
  title: 'Shared/EndOfList',
  component: EndOfList,
  tags: ['autodocs'],
  args: {
    label: 'End of posts',
  },
} satisfies Meta<typeof EndOfList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Posts: Story = {};
