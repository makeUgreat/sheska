import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { type GetPostResponse } from '@/entities/post';
import { PostArticleSection } from './post-article-section';

const READY_SUMMARY = {
  status: 'ready',
  lines: [
    '페이지는 widget을, widget은 feature와 entity를 조합한다.',
    'slice는 index.ts로만 밖에 드러난다.',
    '같은 layer의 slice끼리는 import하지 않는다.',
  ],
} as const;

const body = [
  'A published post carries the same markdown body as the [[note|노트]] it came from.',
  '',
  '## Layers',
  '',
  'A page composes widgets; a widget composes features, entities and shared UI.',
  '',
  '```txt',
  '# this heading lives in a code fence and stays a code line',
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
  summary: { status: 'pending' },
  body,
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-21T12:00:00.000Z',
};

const meta = {
  title: 'Features/Posts/PostArticleSection',
  component: PostArticleSection,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof PostArticleSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    state: { status: 'success', post },
  },
};

/** 소유자에게만 조회수가 링크다. hover하면 색이 바뀌고 화살표가 밀려 들어온다. */
export const Owner: Story = {
  args: {
    state: { status: 'success', post },
    canOpenViews: true,
  },
};

export const SummaryReady: Story = {
  args: {
    state: {
      status: 'success',
      post: { ...post, summary: { ...READY_SUMMARY, lines: [...READY_SUMMARY.lines] } },
    },
  },
};

export const SummaryFailed: Story = {
  args: {
    state: { status: 'success', post: { ...post, summary: { status: 'failed' } } },
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
