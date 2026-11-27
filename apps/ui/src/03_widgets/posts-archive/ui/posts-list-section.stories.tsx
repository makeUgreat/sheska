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

export const ProjectTabs: Story = {
  name: '탭은 고른 프로젝트를 눌린 상태로 보이고, 누른 탭의 프로젝트를 알린다',
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

export const OpensAndClosesSearch: Story = {
  name: 'Search를 누르면 탭 줄 자리에 검색 줄이 열리고, Esc를 누르면 닫혀 Search로 돌아간다',
  tags: ['!dev'],
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Search' }));
    await expect(canvas.getByRole('searchbox', { name: 'Search posts by title or content' })).toHaveFocus();
    await expect(canvas.queryByRole('group', { name: 'Filter by project' })).toBeNull();
    await expect(canvas.getByRole('status')).toHaveTextContent('Press Enter to search');

    await userEvent.keyboard('{Escape}');
    await expect(args.search.onClose).toHaveBeenCalledTimes(1);
    await expect(canvas.getByRole('button', { name: 'Search' })).toHaveFocus();
    await expect(canvas.getByRole('group', { name: 'Filter by project' })).toBeVisible();
  },
};

export const KeepsListInPlace: Story = {
  name: '검색 줄을 열어도 목록은 제자리에 있다',
  tags: ['!dev'],
  play: async ({ canvas, userEvent }) => {
    await document.fonts.ready;

    const firstRow = canvas.getByRole('link', { name: /Introducing Storybook/ });
    const before = firstRow.getBoundingClientRect().top;

    await userEvent.click(canvas.getByRole('button', { name: 'Search' }));
    await expect(firstRow.getBoundingClientRect().top).toBe(before);
  },
};

export const KeepsListInPlaceAt320: Story = {
  name: '320px에서 탭 줄이 두 줄이어도 검색 줄을 열 때 목록은 제자리에 있다',
  tags: ['!dev'],
  globals: { viewport: { value: 'width320', isRotated: false } },
  parameters: { viewport: { options: VIEWPORTS } },
  play: async ({ canvas, userEvent }) => {
    await expect(window.innerWidth).toBe(320);
    await document.fonts.ready;

    const firstRow = canvas.getByRole('link', { name: /Introducing Storybook/ });
    const before = firstRow.getBoundingClientRect().top;

    await userEvent.click(canvas.getByRole('button', { name: 'Search' }));
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

export const SearchHidesProjectTabs: Story = {
  name: '검색하는 동안에는 탭 줄 대신 검색어와 검색 방식을 보인다',
  tags: ['!dev'],
  args: SmartSearch.args,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: /Introducing Storybook/ })).toBeVisible();
    await expect(canvas.queryByRole('group', { name: 'Filter by project' })).toBeNull();
    await expect(canvas.getByRole('status')).toHaveTextContent('Results for “storybook”· Smart search');
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
