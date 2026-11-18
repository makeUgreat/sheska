import type { Meta, StoryObj } from '@storybook/react-vite';
import { TerminalWindow } from './terminal-window';

const meta = {
  title: 'Widgets/LandingHero/TerminalWindow',
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
    yellowLabel: 'Log in',
    onYellowClick: () => undefined,
    children: (
      <p>
        <span className="text-secondary">visitor@hash:~$</span>{' '}
        <span className="text-white">ls</span>
      </p>
    ),
  },
} satisfies Meta<typeof TerminalWindow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
