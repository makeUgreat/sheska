import type { Meta, StoryObj } from '@storybook/react-vite';
import { type GetPostResponse } from '@/entities/post';
import { parseOutline } from '@/shared/lib';
import { PostArticleSection } from './post-article-section';

const body = [
  'A published post carries the same markdown body as the [[note|노트]] it came from.',
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

const post: GetPostResponse = {
  postId: 'post-fsd',
  sourceId: 'source-fsd',
  title: 'Feature-Sliced Design in the Sheska UI',
  viewCount: 128,
  body,
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-21T12:00:00.000Z',
};

const outline = parseOutline(body);

const meta = {
  title: 'Features/Posts/PostArticleSection',
  component: PostArticleSection,
} satisfies Meta<typeof PostArticleSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    state: { status: 'success', post, outline, activeHeadingId: outline[0].id },
  },
};

export const WithoutOutline: Story = {
  args: {
    state: {
      status: 'success',
      post: { ...post, body: 'A short post that carries no heading at all.' },
      outline: [],
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
    state: { status: 'error', error: new Error('Failed to load the post') },
  },
};
