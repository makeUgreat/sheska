import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { type NoteSummary } from '@/entities/note';
import { NoteCard } from './note-card';

const sampleNote: NoteSummary = {
  noteId: 'note-storybook-intro',
  sourceId: 'source-storybook-intro',
  title: 'Introducing Storybook to the Sheska UI',
  aliases: ['Storybook Intro'],
  keywords: ['storybook', 'ui'],
  createdAt: '2026-08-05T08:30:00.000Z',
  updatedAt: '2026-08-05T09:30:00.000Z',
};

const meta = {
  title: 'Features/Notes/NoteCard',
  component: NoteCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="w-full max-w-[420px] px-6">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    note: sampleNote,
  },
} satisfies Meta<typeof NoteCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AliasesOnly: Story = {
  args: {
    note: {
      ...sampleNote,
      keywords: [],
    },
  },
};

export const KeywordsOnly: Story = {
  args: {
    note: {
      ...sampleNote,
      aliases: [],
    },
  },
};

export const WithoutTags: Story = {
  args: {
    note: {
      ...sampleNote,
      aliases: [],
      keywords: [],
    },
  },
};

export const LongTitle: Story = {
  args: {
    note: {
      ...sampleNote,
      title:
        'A long note title that should remain readable when the archive card wraps across multiple lines',
    },
  },
};

export const ManyTags: Story = {
  args: {
    note: {
      ...sampleNote,
      aliases: ['Storybook Intro', 'UI Fixtures'],
      keywords: ['storybook', 'ui', 'component', 'fixture', 'review'],
    },
  },
};
