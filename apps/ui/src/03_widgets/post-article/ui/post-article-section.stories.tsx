import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, within } from 'storybook/test';
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
  series: null,
  body,
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-21T12:00:00.000Z',
};

const meta = {
  title: 'Widgets/PostArticle/PostArticleSection',
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

export const SummarySingleLine: Story = {
  args: {
    state: {
      status: 'success',
      post: { ...post, summary: { status: 'ready', lines: [READY_SUMMARY.lines[0]] } },
    },
  },
};

export const SummaryFailed: Story = {
  args: {
    state: { status: 'success', post: { ...post, summary: { status: 'failed' } } },
  },
};

const SERIES = {
  name: 'Sheska UI 구조',
  position: 2,
  total: 3,
  posts: [
    { postId: 'post-layers', title: 'Layer는 아래로만 의존한다' },
    { postId: 'post-fsd', title: 'Feature-Sliced Design in the Sheska UI' },
    { postId: 'post-slices', title: 'Slice는 index.ts로만 드러난다' },
  ],
};

const LONG_SERIES_NAME = '검색 증강 생성(RAG) 파이프라인을 처음부터 끝까지 직접 만들어 보기';

const VIEWPORTS = {
  width320: { name: '320 × 900', styles: { width: '320px', height: '900px' } },
};

export const InSeries: Story = {
  args: {
    state: { status: 'success', post: { ...post, series: SERIES } },
  },
};

export const SeriesPlaceAndContents: Story = {
  name: '시리즈 글은 제목 위에 이름과 자리를, 본문 끝에 전체 목록을 보인다',
  tags: ['!dev'],
  args: InSeries.args,
  play: async ({ canvas }) => {
    const header = within(canvas.getByRole('banner'));
    await expect(header.getByText('Sheska UI 구조')).toBeVisible();
    await expect(header.getByText('2 / 3')).toBeVisible();

    const contents = within(canvas.getByRole('navigation', { name: 'Sheska UI 구조' }));
    const items = contents.getAllByRole('listitem');
    await expect(items).toHaveLength(3);
    await expect(contents.getByRole('link', { name: 'Layer는 아래로만 의존한다' })).toHaveAttribute('href', '/posts/post-layers');
    await expect(contents.getByRole('link', { name: 'Slice는 index.ts로만 드러난다' })).toHaveAttribute('href', '/posts/post-slices');

    const current = contents.getByText('Feature-Sliced Design in the Sheska UI');
    await expect(current).toHaveAttribute('aria-current', 'page');
    await expect(current.closest('a')).toBeNull();
  },
};

export const NoSeries: Story = {
  name: '시리즈가 없는 글은 시리즈 줄과 목록을 그리지 않는다',
  tags: ['!dev'],
  args: { state: { status: 'success', post } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Series')).toBeNull();
    await expect(canvas.queryByRole('navigation')).toBeNull();
  },
};

export const LongSeriesNameAt320: Story = {
  name: '320px에서 긴 시리즈 이름은 한 줄로 자르고 자리는 남긴다',
  tags: ['!dev'],
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'width320', isRotated: false } },
  args: {
    state: { status: 'success', post: { ...post, series: { ...SERIES, name: LONG_SERIES_NAME } } },
  },
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBe(320);
    await document.fonts.ready;

    const header = within(canvas.getByRole('banner'));
    const name = header.getByText(LONG_SERIES_NAME);
    await expect(name).toHaveAttribute('title', LONG_SERIES_NAME);
    await expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
    await expect(header.getByText('2 / 3')).toBeVisible();
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
