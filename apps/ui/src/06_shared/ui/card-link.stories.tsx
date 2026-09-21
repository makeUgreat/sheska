import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { CARD_LINK_TITLE, CardLink } from './card-link';

const meta = {
  title: 'Shared UI/CardLink',
  component: CardLink,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="w-full max-w-[560px] px-6 py-6">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    to: '/posts/sample',
    className: '-mx-6 p-6',
    children: (
      <>
        <span className="block font-mono text-label-sm uppercase text-text-muted">
          2026-09-21
        </span>
        <h3
          className={`mt-2.5 font-sans text-headline-md text-text-primary ${CARD_LINK_TITLE}`}
        >
          Hover me to see the shared card reaction
        </h3>
        <p className="mt-3 text-body-md text-text-secondary">
          Every card surface lifts, tints, and colors its title the same way.
        </p>
      </>
    ),
  },
} satisfies Meta<typeof CardLink>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const GridCardPadding: Story = {
  args: {
    className: '-mx-3.5 h-full px-3.5 py-6',
  },
};
