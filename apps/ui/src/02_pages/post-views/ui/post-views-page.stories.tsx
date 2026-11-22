import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ListPostViewsResponse } from '@/entities/post';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';
import { PostViewsPage } from './post-views-page';

function at(day: number, hours: number, minutes: number) {
  return new Date(2026, 10, day, hours, minutes).toISOString();
}

const FIRST_PAGE: ListPostViewsResponse = {
  views: [
    { viewedAt: at(21, 14, 5), ip: '203.0.113.24', client: 'Mozilla/5.0 (Macintosh) Chrome/131.0.0.0' },
    { viewedAt: at(21, 11, 48), ip: '192.0.2.15', client: 'unknown' },
    { viewedAt: at(20, 22, 40), ip: '198.51.100.42', client: 'Mozilla/5.0 (Windows NT 10.0) Firefox/132.0' },
  ],
  nextCursor: 'cursor-2',
};

const SECOND_PAGE: ListPostViewsResponse = {
  views: [{ viewedAt: at(19, 9, 12), ip: '66.249.66.1', client: 'Googlebot/2.1' }],
  nextCursor: null,
};

function buildClient(get: ReturnType<typeof fn> = fn(() => Promise.resolve({ ...FIRST_PAGE, nextCursor: null }))) {
  const client = { get, post: fn(() => Promise.resolve(undefined)), patch: fn(), postStream: fn() } as unknown as HttpClient;
  return { get, client };
}

function withPage(client: HttpClient): Decorator {
  return (Story) => (
    <MemoryRouter initialEntries={['/posts/post-1/views']}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <HttpClientProvider client={client}>
          <Routes>
            <Route path="/posts/:id/views" element={<Story />} />
          </Routes>
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

const meta = {
  title: 'Pages/PostViews/PostViewsPage',
  component: PostViewsPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PostViewsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

function rowTexts({ canvas }: PlayContext) {
  return canvas
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    );
}

export const Rows: Story = {
  name: '조회내역을 시각, IP, 방문 수단 순서로 그린다',
  tags: ['!dev'],
  decorators: [withPage(buildClient().client)],
  play: async (context) => {
    await context.canvas.findByRole('table');

    await expect(rowTexts(context)).toEqual([
      ['11.21 14:05', '203.0.113.24', 'Mozilla/5.0 (Macintosh) Chrome/131.0.0.0'],
      ['11.21 11:48', '192.0.2.15', 'unknown'],
      ['11.20 22:40', '198.51.100.42', 'Mozilla/5.0 (Windows NT 10.0) Firefox/132.0'],
    ]);
    await expect(context.canvas.getByText('End of history')).toBeDefined();
  },
};

export const ClientTitle: Story = {
  name: '방문 수단은 hover로 원문 전체를 보인다',
  tags: ['!dev'],
  decorators: [withPage(buildClient().client)],
  play: async ({ canvas }) => {
    const cell = await canvas.findByRole('cell', { name: 'Mozilla/5.0 (Macintosh) Chrome/131.0.0.0' });

    await expect(cell.getAttribute('title')).toBe('Mozilla/5.0 (Macintosh) Chrome/131.0.0.0');
  },
};

export const DayStart: Story = {
  name: '날짜가 바뀌는 행을 그날의 첫 행으로 표시한다',
  tags: ['!dev'],
  decorators: [withPage(buildClient().client)],
  play: async ({ canvas }) => {
    await canvas.findByRole('table');
    const rows = canvas.getAllByRole('row').slice(1);

    await expect(rows.map((row) => row.hasAttribute('data-starts-day'))).toEqual([false, false, true]);
  },
};

/** 표 아래의 sentinel이 처음에는 화면 밖에 있어야 scroll이 다음 페이지를 부른다. 첫 페이지 세 행의 표가 이 높이를 넘는다. */
const SHORT_VIEWPORTS = {
  short: { name: '1024 × 240', styles: { width: '1024px', height: '240px' } },
};

const twoPagesHttp = buildClient(
  fn((_path: string, _schema: unknown, params?: Record<string, string>) =>
    Promise.resolve(params?.cursor === 'cursor-2' ? SECOND_PAGE : FIRST_PAGE),
  ),
);

export const NextPage: Story = {
  name: '목록 끝에 닿으면 다음 페이지를 받아 이어 붙인다',
  tags: ['!dev'],
  decorators: [withPage(twoPagesHttp.client)],
  parameters: { viewport: { options: SHORT_VIEWPORTS } },
  globals: { viewport: { value: 'short', isRotated: false } },
  play: async (context) => {
    const { canvas } = context;
    const { get } = twoPagesHttp;

    const table = await canvas.findByRole('table');
    await expect(table.getBoundingClientRect().bottom).toBeGreaterThan(window.innerHeight);
    await expect(get).toHaveBeenCalledTimes(1);
    window.scrollTo({ top: document.documentElement.scrollHeight });

    await canvas.findByRole('cell', { name: '66.249.66.1' });
    await expect(get).toHaveBeenLastCalledWith('/posts/post-1/views', expect.anything(), { cursor: 'cursor-2' });
    await expect(rowTexts(context)).toHaveLength(4);
  },
};

export const Unauthorized: Story = {
  name: '권한이 없으면 상태 코드와 함께 실패를 알린다',
  tags: ['!dev'],
  decorators: [withPage(buildClient(fn(() => Promise.reject(new HttpError(401, 'Unauthorized')))).client)],
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toBeDefined();
    await expect(canvas.getByText('401')).toBeDefined();
    await expect(canvas.queryByRole('table')).toBeNull();
  },
};

export const Empty: Story = {
  name: '조회내역이 없으면 빈 상태를 보인다',
  tags: ['!dev'],
  decorators: [withPage(buildClient(fn(() => Promise.resolve({ views: [], nextCursor: null }))).client)],
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Nothing has been collected yet.')).toBeDefined();
    await expect(canvas.queryByRole('table')).toBeNull();
  },
};

export const BackLink: Story = {
  name: '돌아가는 링크는 그 글로 간다',
  tags: ['!dev'],
  decorators: [withPage(buildClient(fn(() => new Promise(() => {}))).client)],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Back to post' }).getAttribute('href')).toBe('/posts/post-1');
  },
};
