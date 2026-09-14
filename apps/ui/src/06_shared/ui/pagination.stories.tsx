import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pagination } from './pagination';

const meta = {
  title: 'Shared UI/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  args: {
    page: 1,
    totalPages: 5,
    onPageChange: () => {},
  },
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MiddlePage: Story = {
  args: {
    page: 3,
    totalPages: 5,
  },
};

export const ManyPages: Story = {
  args: {
    page: 12,
    totalPages: 30,
  },
};

export const SinglePage: Story = {
  args: {
    page: 1,
    totalPages: 1,
  },
};
