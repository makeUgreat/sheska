import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { BackLink } from './back-link';

const meta = {
  title: 'Shared UI/BackLink',
  component: BackLink,
  tags: ['autodocs'],
  args: {
    to: '/notes',
    children: 'Back to notes',
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="p-6">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof BackLink>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Hover or tab to it: the label unrolls. */
export const Notes: Story = {};

export const Posts: Story = {
  args: { to: '/posts', children: 'Back to posts' },
};
