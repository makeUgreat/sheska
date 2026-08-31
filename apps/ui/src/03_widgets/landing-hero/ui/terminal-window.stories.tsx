import type { Meta, StoryObj } from '@storybook/react-vite';
import { TerminalWindow } from './terminal-window';

const meta = {
  title: 'Features/Posts/TerminalWindow',
  component: TerminalWindow,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-screen max-w-container-terminal px-4">
        <Story />
      </div>
    ),
  ],
  args: {
    prompt: (
      <div className="mb-4">
        <span className="text-secondary">visitor@garden:~$</span>{' '}
        <span className="text-white">garden-cli init</span>
      </div>
    ),
    children: (
      <div className="text-accent">
        Loading semantic nodes...
        <br />
        Ready for input.
      </div>
    ),
    cursor: (
      <div className="mt-4 flex items-center">
        <span className="text-secondary">visitor@garden:~$</span>
        <span className="ml-2 h-5 w-2 animate-pulse bg-accent" />
      </div>
    ),
  },
} satisfies Meta<typeof TerminalWindow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomTitle: Story = {
  args: {
    title: 'garden-cli - preview',
  },
};
