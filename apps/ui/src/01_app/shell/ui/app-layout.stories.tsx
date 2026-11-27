import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect } from 'storybook/test';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpClientProvider, type HttpClientType as HttpClient } from '@/shared/api';
import { AttachmentBaseUrlProvider } from '@/shared/ui';
import { routes } from '../model/routes';

interface ResponseSchema {
  parse(data: unknown): unknown;
}

const NOW = '2026-01-01T00:00:00.000Z';

/** Titles arrive from note filenames, so one unbreakable token is not exotic. */
const UNBREAKABLE = 'pneumonoultramicroscopicsilicovolcanoconiosis-antidisestablishmentarianism';

const BODY = `# Heading one

A paragraph with an unbroken token ${UNBREAKABLE} and a [link](https://example.com/${UNBREAKABLE}).

![A figure sized wider than the reading column|1360](att/wide.png)

| column one | column two | column three | column four | column five |
| --- | --- | --- | --- | --- |
| ${UNBREAKABLE} | value | value | value | value |

\`\`\`ts
const wide = call(argumentOne, argumentTwo, argumentThree, argumentFour, argumentFive);
\`\`\`
`;

const POSTS = [
  {
    postId: 'post-0',
    sourceId: 'source-0',
    title: `The Fractal Nature of Design Systems ${UNBREAKABLE}`,
    viewCount: 8,
    summary: { status: 'pending' },
    series: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    postId: 'post-1',
    sourceId: 'source-1',
    title: 'Building a Digital Garden from the Terminal',
    viewCount: 3,
    summary: { status: 'pending' },
    series: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const SOURCES = [
  {
    sourceId: 'source-0',
    externalSourceId: `obsidian://vault/notes/${UNBREAKABLE}.md`,
    title: `Source titled ${UNBREAKABLE}`,
    fingerprint: 'f'.repeat(64),
    sizeBytes: 12345,
    createdAt: NOW,
    updatedAt: NOW,
    latestSyncJob: {
      syncJobId: 'sync-job-0',
      status: 'completed',
      totalChunks: 12,
      createdAt: NOW,
    },
    publishedPostId: 'post-0',
  },
];

const RESPONSES: Record<string, unknown> = {
  '/posts': { posts: POSTS, nextCursor: null },
  '/posts/count': { count: POSTS.length },
  '/posts/search': {
    posts: POSTS,
    nextCursor: null,
    semanticSearchApplied: true,
  },
  '/posts/post-0': { ...POSTS[0], body: BODY },
  '/sources': {
    sources: SOURCES,
    page: 1,
    pageSize: 20,
    totalCount: 42,
    totalPages: 3,
  },
  '/sources/source-0': {
    ...SOURCES[0],
    frontmatter: { title: 'Source zero', aliases: UNBREAKABLE },
    body: BODY,
    embedding: {
      model: 'text-embedding-3-small',
      dimensions: 1536,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
};

/** 실제 HttpClient처럼 응답을 schema로 parse한다. 모르는 경로에는 빈 객체를 준다. */
function respondTo(path: string, schema?: ResponseSchema) {
  return Promise.resolve(RESPONSES[path] ?? {}).then((body) => schema?.parse(body));
}

function buildStoryHttpClient(): HttpClient {
  return {
    get: (path: string, schema: ResponseSchema) => respondTo(path, schema),
    post: (path: string, _body: unknown, schema?: ResponseSchema) => respondTo(path, schema),
    patch: (path: string, _body: unknown, schema: ResponseSchema) => respondTo(path, schema),
    delete: (path: string) => respondTo(path),
  } as unknown as HttpClient;
}

function StoryApp({ initialEntry }: { initialEntry: string }) {
  const [router] = useState(() => createMemoryRouter(routes, { initialEntries: [initialEntry] }));
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  return (
    <QueryClientProvider client={queryClient}>
      <HttpClientProvider client={buildStoryHttpClient()}>
        <AttachmentBaseUrlProvider baseUrl={`${window.location.origin}/attachments`}>
          <RouterProvider router={router} />
        </AttachmentBaseUrlProvider>
      </HttpClientProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: 'App/Shell/AppLayout',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;
type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

/**
 * 320px is the support floor, 640px is where the header and the search row change shape,
 * 900px is where the archive year and the back link move into the left margin.
 */
type Width = 320 | 640 | 900 | 1280;

const VIEWPORTS = {
  width320: { name: '320 × 900', styles: { width: '320px', height: '900px' } },
  width640: { name: '640 × 900', styles: { width: '640px', height: '900px' } },
  width900: { name: '900 × 900', styles: { width: '900px', height: '900px' } },
  width1280: { name: '1280 × 900', styles: { width: '1280px', height: '900px' } },
};

/** route마다 fixture가 화면에 그려졌다는 표시다. 이것이 보인 뒤에 폭을 잰다. */
const ROUTES = {
  '/': (canvas: Canvas) => canvas.findByRole('link', { name: 'posts' }),
  '/about': (canvas: Canvas) => canvas.findByRole('heading', { level: 1 }),
  '/about/home-cluster': (canvas: Canvas) => canvas.findByRole('heading', { level: 1 }),
  '/posts': (canvas: Canvas) => canvas.findByRole('link', { name: /Building a Digital Garden from the Terminal/ }),
  '/posts/post-0': (canvas: Canvas) => canvas.findByRole('table'),
  '/sources': (canvas: Canvas) => canvas.findByRole('link', { name: `Source titled ${UNBREAKABLE}` }),
  '/sources/source-0': (canvas: Canvas) => canvas.findByRole('table'),
};

function atViewport(width: Width, route: keyof typeof ROUTES): Pick<Story, 'parameters' | 'globals' | 'render'> {
  return {
    parameters: { viewport: { options: VIEWPORTS } },
    globals: { viewport: { value: `width${width}`, isRotated: false } },
    render: () => <StoryApp initialEntry={route} />,
  };
}

function horizontalOverflow() {
  const root = document.documentElement;
  return root.scrollWidth - root.clientWidth;
}

function noHorizontalScroll(width: Width, route: keyof typeof ROUTES): Story {
  return {
    name: `${width}px에서는 어떤 route도 가로로 밀리지 않는다 (${route})`,
    tags: ['!dev'],
    ...atViewport(width, route),
    play: async ({ canvas }) => {
      await expect(window.innerWidth).toBe(width);

      await ROUTES[route](canvas);
      await document.fonts.ready;

      await expect(horizontalOverflow()).toBeLessThanOrEqual(0);
    },
  };
}

export const At320Landing: Story = noHorizontalScroll(320, '/');
export const At320About: Story = noHorizontalScroll(320, '/about');
export const At320Service: Story = noHorizontalScroll(320, '/about/home-cluster');
export const At320Posts: Story = noHorizontalScroll(320, '/posts');
export const At320PostDetail: Story = noHorizontalScroll(320, '/posts/post-0');
export const At320Sources: Story = noHorizontalScroll(320, '/sources');
export const At320SourceDetail: Story = noHorizontalScroll(320, '/sources/source-0');

export const At640Landing: Story = noHorizontalScroll(640, '/');
export const At640Posts: Story = noHorizontalScroll(640, '/posts');
export const At640PostDetail: Story = noHorizontalScroll(640, '/posts/post-0');
export const At640Sources: Story = noHorizontalScroll(640, '/sources');
export const At640SourceDetail: Story = noHorizontalScroll(640, '/sources/source-0');

export const At900Landing: Story = noHorizontalScroll(900, '/');
export const At900Posts: Story = noHorizontalScroll(900, '/posts');
export const At900PostDetail: Story = noHorizontalScroll(900, '/posts/post-0');
export const At900Sources: Story = noHorizontalScroll(900, '/sources');
export const At900SourceDetail: Story = noHorizontalScroll(900, '/sources/source-0');

export const At1280Landing: Story = noHorizontalScroll(1280, '/');
export const At1280Posts: Story = noHorizontalScroll(1280, '/posts');
export const At1280PostDetail: Story = noHorizontalScroll(1280, '/posts/post-0');
export const At1280Sources: Story = noHorizontalScroll(1280, '/sources');
export const At1280SourceDetail: Story = noHorizontalScroll(1280, '/sources/source-0');

export const SearchAt320: Story = {
  name: '320px에서도 검색어를 입력할 수 있다',
  tags: ['!dev'],
  ...atViewport(320, '/posts'),
  play: async ({ canvas, userEvent }) => {
    await expect(window.innerWidth).toBe(320);
    const searchbox = canvas.getByRole('searchbox');
    const { width, height } = searchbox.getBoundingClientRect();
    await expect(searchbox).toBeVisible();
    await expect(searchbox).toBeEnabled();
    await expect(width).toBeGreaterThan(0);
    await expect(height).toBeGreaterThan(0);

    await userEvent.type(searchbox, 'fractal');

    await expect(searchbox).toHaveValue('fractal');
  },
};
