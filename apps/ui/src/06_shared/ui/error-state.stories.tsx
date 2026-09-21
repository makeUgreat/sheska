import type { Meta, StoryObj } from '@storybook/react-vite';
import { HttpError } from '@/shared/api';
import { ErrorState } from './error-state';

const PAGE_COLUMN = 'w-screen max-w-[880px]';

const meta = {
  title: 'Shared UI/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className={PAGE_COLUMN}>
        <Story />
      </div>
    ),
  ],
  args: {
    error: new HttpError(503, 'Service Unavailable'),
  },
} satisfies Meta<typeof ErrorState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ServiceUnavailable: Story = {};

export const ServerError: Story = {
  args: { error: new HttpError(500, 'Internal Server Error') },
};

export const NotFound: Story = {
  args: { error: new HttpError(404, 'Not Found') },
};

export const ServerUnreachable: Story = {
  args: { error: new TypeError('Failed to fetch') },
};
