import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { expect, fn, waitFor, within } from 'storybook/test';
import { type PostSummary } from '@/entities/post';
import { PostsListSection } from './posts-list-section';

const LONG_SERIES_NAME = '집에서 돌리는 k3s 클러스터를 처음부터 운영까지 기록하기';

const samplePosts: PostSummary[] = [
  {
    postId: 'post-storybook-intro',
    sourceId: 'source-storybook-intro',
    title: 'Introducing Storybook to the Sheska UI',
    viewCount: 342,
    summary: {
      status: 'ready',
      lines: [
        'Storybook을 UI 상태 확인 도구로 들였다.',
        '상태마다 fixture를 두어 리뷰 화면으로 쓴다.',
        '동작 검증은 통합 테스트에 남겼다.',
      ],
    },
    series: { name: 'Sheska UI 구조', position: 3, total: 4 },
    project: 'sheska',
    createdAt: '2026-08-05T08:30:00.000Z',
    updatedAt: '2026-08-05T09:30:00.000Z',
  },
  {
    postId: 'post-visual-fixtures',
    sourceId: 'source-visual-fixtures',
    title: 'Using UI State Fixtures for Component Review',
    viewCount: 91,
    summary: { status: 'failed' },
    series: null,
    project: 'siru',
    createdAt: '2026-08-04T08:30:00.000Z',
    updatedAt: '2026-08-04T09:30:00.000Z',
  },
  {
    postId: 'post-long-title',
    sourceId: 'source-long-title',
    title: 'A deliberately long archive title that should wrap cleanly inside the post list section',
    viewCount: 1_208,
    summary: { status: 'pending' },
    series: { name: LONG_SERIES_NAME, position: 3, total: 12 },
    project: 'sheksa',
    createdAt: '2026-08-03T08:30:00.000Z',
    updatedAt: '2026-08-03T09:30:00.000Z',
  },
];

const meta = {
  title: 'Widgets/PostsArchive/PostsListSection',
  component: PostsListSection,
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
    search: {
      query: '',
      onQueryChange: () => undefined,
      onQuerySubmit: () => undefined,
      onClose: fn(),
      normalizedQuery: '',
      mode: null,
    },
    filter: {
      project: null,
      onProjectChange: fn(),
      listedProject: null,
      switching: false,
    },
    state: {
      status: 'success',
      posts: samplePosts,
      hasNextPage: false,
      sentinelRef: null,
    },
  },
} satisfies Meta<typeof PostsListSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Populated: Story = {};

const VIEWPORTS = {
  width320: { name: '320 × 900', styles: { width: '320px', height: '900px' } },
  width1280: { name: '1280 × 900', styles: { width: '1280px', height: '900px' } },
};

export const LongSeriesNameAt320: Story = {
  name: '320px에서 긴 시리즈 이름은 한 줄로 자르고 자리는 남긴다',
  tags: ['!dev'],
  globals: { viewport: { value: 'width320', isRotated: false } },
  parameters: { viewport: { options: VIEWPORTS } },
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBe(320);
    await document.fonts.ready;

    const link = canvas.getByRole('link', { name: /A deliberately long archive title/ });
    const name = within(link).getByText(LONG_SERIES_NAME);
    await expect(name).toHaveAttribute('title', LONG_SERIES_NAME);
    await expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
    await expect(within(link).getByText('3 / 12')).toBeVisible();
  },
};

export const ProjectMeta: Story = {
  name: '관련 프로젝트는 로고와 이름을 시리즈 앞에 두고, 화면이 모르는 값은 보이지 않는다',
  tags: ['!dev'],
  play: async ({ canvas }) => {
    const withSeries = canvas.getByRole('link', { name: /Introducing Storybook/ });
    const withoutSeries = canvas.getByRole('link', { name: /Using UI State Fixtures/ });
    const unknown = canvas.getByRole('link', { name: /A deliberately long archive title/ });

    await expect(withSeries.textContent).toMatch(/Sheska·SeriesSheska UI 구조3 \/ 4/);
    await expect(within(withoutSeries).getByText('Siru')).toBeVisible();
    await expect(withoutSeries.textContent).not.toContain('·');
    await expect(within(unknown).queryByText(/sheksa/i)).toBeNull();
    await expect(within(unknown).getByText('3 / 12')).toBeVisible();
  },
};

export const ProjectIndex: Story = {
  name: '프로젝트 목록은 고른 프로젝트를 눌린 상태로 보이고, 누른 프로젝트를 알린다',
  tags: ['!dev'],
  args: {
    filter: { project: 'sheska', onProjectChange: fn(), listedProject: 'sheska', switching: false },
  },
  play: async ({ canvas, args, userEvent }) => {
    const group = within(canvas.getByRole('group', { name: 'Filter by project' }));
    const tabs = group.getAllByRole('button').filter((button) => button.hasAttribute('aria-pressed'));

    await expect(group.getByRole('button', { name: 'Sheska' })).toHaveAttribute('aria-pressed', 'true');
    await expect(group.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    await expect(tabs.map((tab) => tab.textContent)).toEqual(['All', 'Sheska', 'Siru', 'Nocap', 'Home Cluster']);

    await userEvent.click(group.getByRole('button', { name: 'Siru' }));
    await expect(args.filter.onProjectChange).toHaveBeenLastCalledWith('siru');

    await userEvent.click(group.getByRole('button', { name: 'All' }));
    await expect(args.filter.onProjectChange).toHaveBeenLastCalledWith(null);
  },
};

export const SearchRunsOnlyOnEnter: Story = {
  name: '검색 칸을 누르면 목록이 물러나 Enter를 기다리고, Esc를 누르면 닫힌다',
  tags: ['!dev'],
  args: {
    search: {
      query: 'stor',
      onQueryChange: fn(),
      onQuerySubmit: fn(),
      onClose: fn(),
      normalizedQuery: '',
      mode: null,
    },
  },
  play: async ({ canvas, args, userEvent }) => {
    const searchbox = canvas.getByRole('searchbox', { name: 'Search posts by title or content' });
    const list = canvas.getByRole('link', { name: /Introducing Storybook/ }).closest('[aria-busy]')!.parentElement!;

    await userEvent.click(searchbox);
    await expect(canvas.getByRole('status')).toHaveTextContent('↵ run');
    await waitFor(() => expect(getComputedStyle(list).opacity).toBe('0.25'));
    await expect(args.search.onQuerySubmit).not.toHaveBeenCalled();

    await userEvent.keyboard('{Enter}');
    await expect(args.search.onQuerySubmit).toHaveBeenCalledTimes(1);

    await userEvent.keyboard('{Escape}');
    await expect(args.search.onClose).toHaveBeenCalledTimes(1);
    await expect(searchbox).not.toHaveFocus();
    await waitFor(() => expect(getComputedStyle(list).opacity).toBe('1'));
  },
};

export const SlashFocusesSearch: Story = {
  name: '/를 누르면 검색 칸으로 간다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    await userEvent.keyboard('/');
    await expect(canvas.getByRole('searchbox', { name: 'Search posts by title or content' })).toHaveFocus();
  },
};

export const IndexInMarginAt1280: Story = {
  name: '넓은 화면에서는 프로젝트 목록을 글 목록 왼쪽 여백에 세로로 둔다',
  tags: ['!dev'],
  globals: { viewport: { value: 'width1280', isRotated: false } },
  parameters: { viewport: { options: VIEWPORTS } },
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBe(1280);
    await document.fonts.ready;

    const group = canvas.getByRole('group', { name: 'Filter by project' });
    const all = within(group).getByRole('button', { name: 'All' });
    const sheska = within(group).getByRole('button', { name: 'Sheska' });
    const title = canvas.getByRole('heading', { level: 1 });
    await expect(group.getBoundingClientRect().right).toBeLessThan(title.getBoundingClientRect().left);
    await expect(sheska.getBoundingClientRect().top).toBeGreaterThan(all.getBoundingClientRect().top);
  },
};

export const IndexAlignedWithTitleAt320: Story = {
  name: '좁은 화면에서는 프로젝트 칩 줄이 제목 아래에 오고, 첫 로고가 제목 왼쪽 끝에 맞는다',
  tags: ['!dev'],
  globals: { viewport: { value: 'width320', isRotated: false } },
  parameters: { viewport: { options: VIEWPORTS } },
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBe(320);
    await document.fonts.ready;

    const title = canvas.getByRole('heading', { level: 1 });
    const firstMark = within(canvas.getByRole('group', { name: 'Filter by project' }))
      .getByRole('button', { name: 'All' })
      .querySelector('svg')!;
    await Promise.all(firstMark.getAnimations().map((animation) => animation.finished));
    await expect(firstMark.getBoundingClientRect().left).toBe(title.getBoundingClientRect().left);
    await expect(firstMark.getBoundingClientRect().top).toBeGreaterThan(title.getBoundingClientRect().bottom);
  },
};

export const KeepsListInPlace: Story = {
  name: '검색 칸을 눌러도 목록은 제자리에 있다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    await document.fonts.ready;

    const firstRow = canvas.getByRole('link', { name: /Introducing Storybook/ });
    const before = firstRow.getBoundingClientRect().top;

    await userEvent.click(canvas.getByRole('searchbox', { name: 'Search posts by title or content' }));
    await expect(firstRow.getBoundingClientRect().top).toBe(before);
  },
};

export const SwitchingProject: Story = {
  name: '프로젝트를 바꾸는 동안 앞 목록을 흐리게 남긴다',
  tags: ['!dev'],
  args: {
    filter: { project: 'siru', onProjectChange: fn(), listedProject: null, switching: true },
  },
  play: async ({ canvas }) => {
    const list = canvas.getByRole('link', { name: /Introducing Storybook/ }).closest('[aria-busy]');

    await expect(list).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(getComputedStyle(list!).opacity).toBe('0.35'));
  },
};

export const MorePages: Story = {
  args: {
    state: {
      status: 'success',
      posts: samplePosts,
      hasNextPage: true,
      sentinelRef: null,
    },
  },
};

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

export const NoSearchResults: Story = {
  args: {
    search: {
      query: 'missing',
      onQueryChange: () => undefined,
      onQuerySubmit: () => undefined,
      onClose: fn(),
      normalizedQuery: 'missing',
      mode: 'smart',
    },
    state: {
      status: 'empty',
    },
  },
};

export const SmartSearch: Story = {
  args: {
    search: {
      query: 'storybook',
      onQueryChange: () => undefined,
      onQuerySubmit: () => undefined,
      onClose: fn(),
      normalizedQuery: 'storybook',
      mode: 'smart',
    },
    state: {
      status: 'success',
      posts: samplePosts.map((post, index) => ({
        ...post,
        similarity: [91, 74, null][index],
        snippet: 'Storybook renders each UI state from a fixture, so a review covers loading, empty and error screens.',
      })),
      hasNextPage: false,
      sentinelRef: null,
    },
  },
};

export const SearchKeepsProjectIndex: Story = {
  name: '검색하는 동안에도 프로젝트 목록은 남고, 검색 방식을 알린다',
  tags: ['!dev'],
  args: SmartSearch.args,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: /Introducing Storybook/ })).toBeVisible();
    await expect(canvas.getByRole('group', { name: 'Filter by project' })).toBeVisible();
    await expect(canvas.getByRole('status')).toHaveTextContent('→ smart search');
  },
};

export const ProjectDuringSearchClosesSearch: Story = {
  name: '검색하는 동안 프로젝트를 누르면 검색을 닫고 그 프로젝트로 거른다',
  tags: ['!dev'],
  args: {
    ...SmartSearch.args,
    filter: { project: null, onProjectChange: fn(), listedProject: null, switching: false },
  },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(within(canvas.getByRole('group', { name: 'Filter by project' })).getByRole('button', { name: 'Siru' }));
    await expect(args.search.onClose).toHaveBeenCalledTimes(1);
    await expect(args.filter.onProjectChange).toHaveBeenLastCalledWith('siru');
  },
};

export const BasicSearchFallback: Story = {
  args: {
    search: {
      query: 'storybook',
      onQueryChange: () => undefined,
      onQuerySubmit: () => undefined,
      onClose: fn(),
      normalizedQuery: 'storybook',
      mode: 'basic',
    },
  },
};

export const ErrorState: Story = {
  args: {
    state: {
      status: 'error',
      error: new Error('Failed to load posts.'),
    },
  },
};
