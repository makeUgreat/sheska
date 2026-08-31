import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { ActionLink } from './action-link';

const meta = {
  title: 'Shared UI/ActionLink',
  component: ActionLink,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    to: '/posts',
    children: 'Read posts',
  },
} satisfies Meta<typeof ActionLink>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutArrow: Story = {
  args: {
    hideArrow: true,
    children: 'Open source',
  },
};
