import type { Meta, StoryObj } from '@storybook/react-vite';
import { type GetNoteResponse } from '@/entities/note';
import { parseOutline } from '@/shared/lib';
import { NoteArticleSection } from './note-article-section';

const body = [
  'Feature-Sliced Design keeps [[layer|레이어]] dependencies pointing downward.',
  '',
  '## Layers',
  '',
  'A page composes widgets; a widget composes features, entities and shared UI.',
  '',
  '```txt',
  '# this heading lives in a code fence and stays out of the outline',
  'app -> pages -> widgets -> features -> entities -> shared',
  '```',
  '',
  '### Slices',
  '',
  '- A slice exposes its public API from `index.ts`.',
  '- Sibling slices never import each other.',
  '',
  '> Unresolved links such as [[note-that-does-not-exist]] are a normal vault state.',
  '',
  '## Segments',
  '',
  'Use `ui`, `model`, `api`, `lib` and `config` inside a slice.',
].join('\n');

const note: GetNoteResponse = {
  noteId: 'note-fsd',
  sourceId: 'source-fsd',
  externalSourceId: 'obsidian-fsd',
  title: 'Feature-Sliced Design in the Sheska UI',
  aliases: ['FSD', 'UI Structure'],
  keywords: ['architecture', 'fsd', 'ui'],
  frontmatter: {},
  body,
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-21T12:00:00.000Z',
};

const outline = parseOutline(body);

const meta = {
  title: 'Features/Notes/NoteArticleSection',
  component: NoteArticleSection,
} satisfies Meta<typeof NoteArticleSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    state: { status: 'success', note, outline, activeHeadingId: outline[0].id },
  },
};

export const WithoutOutline: Story = {
  args: {
    state: {
      status: 'success',
      note: { ...note, body: 'A short note that carries no heading at all.' },
      outline: [],
      activeHeadingId: null,
    },
  },
};

export const WithoutKeywords: Story = {
  args: {
    state: {
      status: 'success',
      note: { ...note, aliases: [], keywords: [] },
      outline,
      activeHeadingId: null,
    },
  },
};

export const Loading: Story = {
  args: { state: { status: 'loading' } },
};

export const Empty: Story = {
  args: { state: { status: 'empty' } },
};

export const Failed: Story = {
  args: {
    state: { status: 'error', error: new Error('Failed to load the note') },
  },
};
