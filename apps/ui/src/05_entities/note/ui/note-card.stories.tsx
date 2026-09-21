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

export const WithoutKeywords: Story = {
  args: {
    note: {
      ...sampleNote,
      keywords: [],
    },
  },
};

export const LongTitle: Story = {
  args: {
    note: {
      ...sampleNote,
      title:
        'A long note title that should stay clamped to two lines instead of stretching the archive card',
    },
  },
};

export const ManyKeywords: Story = {
  args: {
    note: {
      ...sampleNote,
      keywords: ['storybook', 'ui', 'component', 'fixture', 'review'],
    },
  },
};

export const LongKeywords: Story = {
  args: {
    note: {
      ...sampleNote,
      keywords: [
        'design-system-documentation',
        'visual-regression-baseline',
        'component-review-workflow',
        'archive',
      ],
    },
  },
};
