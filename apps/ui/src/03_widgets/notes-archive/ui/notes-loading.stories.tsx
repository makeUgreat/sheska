import type { Meta, StoryObj } from '@storybook/react-vite';
import { EndOfNotes, NotesLoading } from './notes-loading';

const meta = {
  title: 'Features/Notes/NotesLoading',
  component: NotesLoading,
  tags: ['autodocs'],
  args: {
    label: 'Loading more notes...',
  },
} satisfies Meta<typeof NotesLoading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

export const InitialLoading: Story = {
  args: {
    label: 'Loading notes...',
  },
};

export const End: Story = {
  render: () => <EndOfNotes />,
};
