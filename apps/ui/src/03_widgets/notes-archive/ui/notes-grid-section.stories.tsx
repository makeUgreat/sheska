import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { type NoteSummary } from '@/entities/note';
import { NotesGridSection } from './notes-grid-section';

const sampleNotes: NoteSummary[] = [
  {
    noteId: 'note-storybook-intro',
    sourceId: 'source-storybook-intro',
    title: 'Introducing Storybook to the Sheska UI',
    aliases: ['Storybook Intro'],
    keywords: ['storybook', 'ui'],
    createdAt: '2026-08-05T08:30:00.000Z',
    updatedAt: '2026-08-05T09:30:00.000Z',
  },
  {
    noteId: 'note-visual-fixtures',
    sourceId: 'source-visual-fixtures',
    title: 'Using UI State Fixtures for Component Review',
    aliases: [],
    keywords: ['fixture', 'review'],
    createdAt: '2026-08-04T08:30:00.000Z',
    updatedAt: '2026-08-04T09:30:00.000Z',
  },
  {
    noteId: 'note-long-title',
    sourceId: 'source-long-title',
    title:
      'A deliberately long archive title that should stay clamped inside the note grid section',
    aliases: ['Long Title'],
    keywords: ['storybook', 'ui', 'component', 'fixture', 'review'],
    createdAt: '2026-08-03T08:30:00.000Z',
    updatedAt: '2026-08-03T09:30:00.000Z',
  },
  {
    noteId: 'note-without-tags',
    sourceId: 'source-without-tags',
    title: 'A Note That Carries No Keyword',
    aliases: [],
    keywords: [],
    createdAt: '2026-08-02T08:30:00.000Z',
    updatedAt: '2026-08-02T09:30:00.000Z',
  },
];

const meta = {
  title: 'Features/Notes/NotesGridSection',
  component: NotesGridSection,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    state: {
      status: 'success',
      notes: sampleNotes,
      hasNextPage: false,
      isFetchingNextPage: false,
      sentinelRef: null,
    },
  },
} satisfies Meta<typeof NotesGridSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Populated: Story = {};

export const Loading: Story = {
  args: {
    state: {
      status: 'loading',
    },
  },
};

export const Empty: Story = {
  args: {
    state: {
      status: 'empty',
    },
  },
};

export const ErrorState: Story = {
  args: {
    state: {
      status: 'error',
      error: new Error('Failed to load notes.'),
    },
  },
};

export const FetchingNextPage: Story = {
  args: {
    state: {
      status: 'success',
      notes: sampleNotes,
      hasNextPage: true,
      isFetchingNextPage: true,
      sentinelRef: null,
    },
  },
};

export const SingleNote: Story = {
  args: {
    state: {
      status: 'success',
      notes: sampleNotes.slice(0, 1),
      hasNextPage: false,
      isFetchingNextPage: false,
      sentinelRef: null,
    },
  },
};
