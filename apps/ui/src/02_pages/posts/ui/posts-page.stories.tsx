import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PostSummary } from '@/entities/post';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';
import { PostsPage } from './posts-page';

const NOW = '2026-01-01T00:00:00.000Z';
const NO_POSTS = { posts: [], nextCursor: null };

function respondWith(value: unknown) {
  return fn(() => Promise.resolve(value));
}

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function buildStoryHttpClient({
  listPosts = respondWith(NO_POSTS),
  countPosts = respondWith({ count: 0 }),
  searchPosts = respondWith(NO_POSTS),
}: {
  listPosts?: (query?: Record<string, string>) => Promise<unknown>;
  countPosts?: () => Promise<unknown>;
  searchPosts?: () => Promise<unknown>;
} = {}): HttpClient {
  return {
    get: fn((path: string, _schema: unknown, query?: Record<string, string>) => {
      if (path === '/posts/count') return countPosts();
      if (path === '/posts/search') return searchPosts();
      return listPosts(query);
    }),
    post: fn(),
    patch: fn(),
  } as unknown as HttpClient;
}

function withPage(client: HttpClient, initialEntries?: string[]) {
  return [
    (Story: () => React.ReactElement) => (
      <MemoryRouter initialEntries={initialEntries}>
        <QueryClientProvider client={createTestQueryClient()}>
          <HttpClientProvider client={client}>
            <Story />
          </HttpClientProvider>
        </QueryClientProvider>
      </MemoryRouter>
    ),
  ];
}

function listing(posts: PostSummary[]) {
  return withPage(buildStoryHttpClient({ listPosts: respondWith({ posts, nextCursor: null }) }));
}

const meta = {
  title: 'Pages/Posts/PostsPage',
  component: PostsPage,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PostsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WaitingForList: Story = {
  name: '목록을 기다리는 동안 빈 상태를 그리지 않는다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ listPosts: fn(() => new Promise(() => {})) })),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Posts' })).toBeDefined();
    await expect(canvas.queryByText('Empty')).toBeNull();
  },
};

export const EmptyList: Story = {
  name: 'post 목록이 없으면 빈 상태 메시지를 보여준다',
  tags: ['!dev'],
  decorators: listing([]),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText('Empty')).toBeDefined());
  },
};

export const LinksToDetail: Story = {
  name: 'post 목록을 상세 링크로 렌더링한다',
  tags: ['!dev'],
  decorators: listing([
    {
      postId: 'post-1',
      sourceId: 'source-1',
      title: '테스트 포스트',
      viewCount: 5,
      summary: { status: 'pending' },
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]),
  play: async ({ canvas }) => {
    const link = await canvas.findByRole('link', { name: /테스트 포스트/ });

    await expect(link.getAttribute('href')).toBe('/posts/post-1');
  },
};

export const SeriesMeta: Story = {
  name: '시리즈 글에만 시리즈 이름과 자리를 보이고, 날짜와 조회수는 보이지 않는다',
  tags: ['!dev'],
  decorators: listing([
    {
      postId: 'post-1',
      sourceId: 'source-1',
      title: '시리즈 포스트',
      viewCount: 1208,
      summary: { status: 'pending' },
      series: { name: 'RAG 파이프라인', position: 2, total: 5 },
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      postId: 'post-2',
      sourceId: 'source-2',
      title: '혼자인 포스트',
      viewCount: 1,
      summary: { status: 'pending' },
      series: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]),
  play: async ({ canvas }) => {
    const inSeries = await canvas.findByRole('link', { name: /시리즈 포스트/ });
    const alone = canvas.getByRole('link', { name: /혼자인 포스트/ });

    await expect(within(inSeries).getByText('RAG 파이프라인')).toBeDefined();
    await expect(within(inSeries).getByText('2 / 5')).toBeDefined();
    await expect(within(alone).queryByText(/ \/ /)).toBeNull();
    await expect(canvas.queryByText(/views?$/)).toBeNull();
    await expect(canvas.queryByText('Jan 01')).toBeNull();
  },
};

export const PendingSummary: Story = {
  name: '검색 중이 아니면 post마다 요약을 작성 중이라고 알린다',
  tags: ['!dev'],
  decorators: listing([
    {
      postId: 'post-1',
      sourceId: 'source-1',
      title: '요약 없는 포스트',
      viewCount: 1,
      summary: { status: 'pending' },
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]),
  play: async ({ canvas }) => {
    const link = await canvas.findByRole('link', { name: /요약 없는 포스트/ });

    await expect(within(link).getByText('요약 작성 중')).toBeDefined();
  },
};

const SUMMARY_LINES = ['첫 문장이다.', '둘째 문장이다.'];

export const ReadySummary: Story = {
  name: '요약이 있으면 받은 줄을 모두 보여준다',
  tags: ['!dev'],
  decorators: listing([
    {
      postId: 'post-1',
      sourceId: 'source-1',
      title: '요약 있는 포스트',
      viewCount: 1,
      summary: { status: 'ready', lines: SUMMARY_LINES },
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]),
  play: async ({ canvas }) => {
    const link = await canvas.findByRole('link', { name: /요약 있는 포스트/ });

    for (const line of SUMMARY_LINES) {
      await expect(within(link).getByText(line)).toBeDefined();
    }
  },
};

export const FailedSummary: Story = {
  name: '요약을 만들지 못했으면 숨기지 않고 실패를 알린다',
  tags: ['!dev'],
  decorators: listing([
    {
      postId: 'post-1',
      sourceId: 'source-1',
      title: '요약 실패한 포스트',
      viewCount: 1,
      summary: { status: 'failed' },
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]),
  play: async ({ canvas }) => {
    const link = await canvas.findByRole('link', { name: /요약 실패한 포스트/ });

    await expect(within(link).getByText('요약을 만들지 못했어요')).toBeDefined();
  },
};

export const SearchSnippet: Story = {
  name: '검색 결과에는 요약 안내 대신 검색어 주변 본문을 보여준다',
  tags: ['!dev'],
  decorators: withPage(
    buildStoryHttpClient({
      searchPosts: respondWith({
        posts: [
          {
            postId: 'search-1',
            sourceId: 'source-1',
            title: '검색된 포스트',
            viewCount: 1,
            summary: { status: 'pending' },
            createdAt: NOW,
            updatedAt: NOW,
            snippet: 'garden 근처 본문',
          },
        ],
        nextCursor: null,
        semanticSearchApplied: false,
      }),
    }),
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Search posts by title or content'), 'garden{Enter}');

    const link = await canvas.findByRole('link', { name: /검색된 포스트/ });
    await expect(within(link).getByText(/근처 본문/)).toBeDefined();
    await expect(within(link).queryByText('요약 작성 중')).toBeNull();
  },
};

export const SemanticSimilarity: Story = {
  name: '의미 검색으로 찾은 항목은 유사도를 항목 안에 보여준다',
  tags: ['!dev'],
  decorators: withPage(
    buildStoryHttpClient({
      searchPosts: respondWith({
        posts: [
          {
            postId: 'semantic-1',
            sourceId: 'source-1',
            title: '의미로 찾은 포스트',
            viewCount: 1,
            summary: { status: 'pending' },
            createdAt: NOW,
            updatedAt: NOW,
            similarity: 91,
          },
          {
            postId: 'keyword-1',
            sourceId: 'source-2',
            title: '키워드로 찾은 포스트',
            viewCount: 2,
            summary: { status: 'pending' },
            createdAt: NOW,
            updatedAt: NOW,
            similarity: null,
          },
        ],
        nextCursor: null,
        semanticSearchApplied: true,
      }),
    }),
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Search posts by title or content'), 'garden{Enter}');

    const semantic = await canvas.findByRole('link', { name: /의미로 찾은 포스트/ });
    const keyword = canvas.getByRole('link', { name: /키워드로 찾은 포스트/ });
    await expect(within(semantic).getByText('91% match')).toBeDefined();
    await expect(within(keyword).queryByText(/% match/)).toBeNull();
  },
};

export const LoadFailed: Story = {
  name: '에러가 발생하면 상태 코드와 실패한 대상을 보여준다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ listPosts: fn(() => Promise.reject(new HttpError(500, 'Internal Server Error'))) })),
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByRole('alert')).toBeDefined();
      await expect(canvas.getByText('500')).toBeDefined();
      await expect(canvas.getByText('Something went wrong while loading.')).toBeDefined();
    });
  },
};

const listOnRender = respondWith(NO_POSTS);

export const ListsOnRender: Story = {
  name: '렌더링 즉시 post 목록 API를 호출한다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ listPosts: listOnRender })),
  play: async () => {
    await waitFor(() => expect(listOnRender).toHaveBeenCalledTimes(1));
  },
};

export const PageHeading: Story = {
  name: '페이지 제목을 보여준다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient()),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Posts' })).toBeDefined();
  },
};

const searchWhileTyping = respondWith(NO_POSTS);

export const TypingDoesNotSearch: Story = {
  name: '검색어 입력만으로는 searchPosts를 호출하지 않는다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ searchPosts: searchWhileTyping })),
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Search posts by title or content'), 'garden');

    await expect(searchWhileTyping).not.toHaveBeenCalled();
  },
};

const searchOnEnter = respondWith({
  posts: [
    {
      postId: 'search-1',
      sourceId: 'source-1',
      title: 'Garden Search Result',
      viewCount: 3,
      summary: { status: 'pending' },
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  nextCursor: null,
  semanticSearchApplied: true,
});

export const SearchOnEnter: Story = {
  name: 'Enter를 누르면 검색한다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ searchPosts: searchOnEnter })),
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Search posts by title or content'), 'garden{Enter}');

    await waitFor(async () => {
      await expect(searchOnEnter).toHaveBeenCalledTimes(1);
      await expect(canvas.getByRole('link', { name: /Garden Search Result/ })).toBeDefined();
    });
  },
};

const searchWithoutMatch = respondWith({ posts: [], nextCursor: null, semanticSearchApplied: false });

export const NoMatchShowsQuery: Story = {
  name: '찾은 글이 없으면 검색어와 함께 알린다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ searchPosts: searchWithoutMatch })),
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Search posts by title or content'), 'fts{Enter}');

    await waitFor(async () => {
      await expect(searchWithoutMatch).toHaveBeenCalledTimes(1);
      await expect(canvas.getByText('"fts"')).toBeDefined();
      await expect(canvas.getByText('No match for')).toBeDefined();
    });
  },
};

const PROJECT_POST: PostSummary = {
  postId: 'post-project',
  sourceId: 'source-project',
  title: '프로젝트 포스트',
  viewCount: 1,
  summary: { status: 'pending' },
  project: 'sheska',
  createdAt: NOW,
  updatedAt: NOW,
};

const listByProject = respondWith(NO_POSTS);

export const FiltersByProject: Story = {
  name: '탭을 누르면 그 프로젝트로 목록을 다시 읽고, All을 누르면 거르기를 푼다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ listPosts: listByProject })),
  play: async ({ canvas, userEvent }) => {
    await waitFor(() => expect(listByProject).toHaveBeenCalledWith(undefined));

    await userEvent.click(canvas.getByRole('button', { name: 'Sheska' }));
    await waitFor(() => expect(listByProject).toHaveBeenLastCalledWith({ project: 'sheska' }));
    await expect(canvas.getByRole('button', { name: 'Sheska' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(canvas.getByRole('button', { name: 'All' }));
    await expect(canvas.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  },
};

const listFromUnknownProject = respondWith(NO_POSTS);

export const IgnoresUnknownProject: Story = {
  name: '주소의 프로젝트를 화면이 모르면 거르지 않는다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ listPosts: listFromUnknownProject }), ['/posts?project=sheksa']),
  play: async ({ canvas }) => {
    await waitFor(() => expect(listFromUnknownProject).toHaveBeenCalledWith(undefined));
    await expect(canvas.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  },
};

const listThenWait = fn((query?: Record<string, string>) =>
  query?.project ? new Promise(() => {}) : Promise.resolve({ posts: [PROJECT_POST], nextCursor: null }),
);

export const KeepsListWhileSwitching: Story = {
  name: '프로젝트를 바꾸면 새 목록이 올 때까지 앞 목록을 흐리게 남긴다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ listPosts: listThenWait })),
  play: async ({ canvas, userEvent }) => {
    const link = await canvas.findByRole('link', { name: /프로젝트 포스트/ });

    await userEvent.click(canvas.getByRole('button', { name: 'Siru' }));
    await waitFor(() => expect(link.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true'));
    await expect(link).toBeVisible();
  },
};

const OTHER_POST: PostSummary = { ...PROJECT_POST, postId: 'post-other', sourceId: 'source-other', title: '다른 포스트', project: 'siru' };

let releaseSheska = () => {};
const listThenRelease = fn((query?: Record<string, string>) =>
  query?.project
    ? new Promise((resolve) => {
        releaseSheska = () => resolve({ posts: [PROJECT_POST], nextCursor: null });
      })
    : Promise.resolve({ posts: [PROJECT_POST, OTHER_POST], nextCursor: null }),
);

export const ReplaysRowsAfterSwitching: Story = {
  name: '프로젝트를 바꾸면 새 목록이 온 뒤에 남은 행도 처음부터 다시 나타난다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ listPosts: listThenRelease })),
  play: async ({ canvas, userEvent }) => {
    const before = (await canvas.findByRole('link', { name: /프로젝트 포스트/ })).closest('li');

    await userEvent.click(canvas.getByRole('button', { name: 'Sheska' }));
    await waitFor(() => expect(listThenRelease).toHaveBeenLastCalledWith({ project: 'sheska' }));
    await expect(canvas.getByRole('link', { name: /프로젝트 포스트/ }).closest('li')).toBe(before);

    releaseSheska();
    await waitFor(() => expect(canvas.queryByRole('link', { name: /다른 포스트/ })).toBeNull());
    await expect(canvas.getByRole('link', { name: /프로젝트 포스트/ }).closest('li')).not.toBe(before);
  },
};

const listBeforeSearch = respondWith(NO_POSTS);

export const SearchClearsProject: Story = {
  name: '검색하면 프로젝트 거르기를 풀고, 닫으면 All로 돌아온다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ listPosts: listBeforeSearch }), ['/posts?project=sheska']),
  play: async ({ canvas, userEvent }) => {
    await waitFor(() => expect(listBeforeSearch).toHaveBeenLastCalledWith({ project: 'sheska' }));

    await userEvent.type(canvas.getByLabelText('Search posts by title or content'), 'garden{Enter}');
    await waitFor(() => expect(canvas.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true'));
    await waitFor(() => expect(listBeforeSearch).toHaveBeenLastCalledWith(undefined));

    await userEvent.click(canvas.getByRole('button', { name: 'Close search' }));
    await expect(canvas.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  },
};

const listWhileClosing = respondWith(NO_POSTS);
const searchNever = respondWith(NO_POSTS);

export const ClosingBeforeSearchKeepsProject: Story = {
  name: '찾기 전에 검색을 닫으면 고른 프로젝트를 그대로 둔다',
  tags: ['!dev'],
  decorators: withPage(buildStoryHttpClient({ listPosts: listWhileClosing, searchPosts: searchNever }), ['/posts?project=sheska']),
  play: async ({ canvas, userEvent }) => {
    await waitFor(() => expect(listWhileClosing).toHaveBeenLastCalledWith({ project: 'sheska' }));

    await userEvent.type(canvas.getByLabelText('Search posts by title or content'), 'gar{Escape}');
    await expect(canvas.getByRole('button', { name: 'Sheska' })).toHaveAttribute('aria-pressed', 'true');
    await expect(listWhileClosing).toHaveBeenLastCalledWith({ project: 'sheska' });
    await expect(searchNever).not.toHaveBeenCalled();
  },
};
