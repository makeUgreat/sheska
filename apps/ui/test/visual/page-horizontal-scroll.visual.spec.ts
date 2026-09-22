import { expect, test, type Page } from '@playwright/test';

const NOW = '2026-01-01T00:00:00.000Z';

/** Titles arrive from note filenames, so one unbreakable token is not exotic. */
const UNBREAKABLE =
  'pneumonoultramicroscopicsilicovolcanoconiosis-antidisestablishmentarianism';

const BODY = `# Heading one

A paragraph with an unbroken token ${UNBREAKABLE} and a [link](https://example.com/${UNBREAKABLE}).

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
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    postId: 'post-1',
    sourceId: 'source-1',
    title: 'Building a Digital Garden from the Terminal',
    viewCount: 3,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const NOTES = [
  {
    noteId: 'note-0',
    sourceId: 'source-0',
    title: `A note titled ${UNBREAKABLE}`,
    aliases: ['alias'],
    keywords: ['tailwind', 'responsive', 'layout'],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    noteId: 'note-1',
    sourceId: 'source-1',
    title: 'The Quiet Art of Refactoring',
    aliases: [],
    keywords: [],
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
  '/notes': { notes: NOTES, nextCursor: null },
  '/notes/note-0': {
    ...NOTES[0],
    externalSourceId: 'note.md',
    frontmatter: { tags: ['layout'] },
    body: BODY,
  },
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

async function serveFixtures(page: Page) {
  await page.route(/\/api\//, async (route) => {
    const { pathname } = new URL(route.request().url());
    if (!pathname.startsWith('/api/')) return route.continue();

    const body = RESPONSES[pathname.replace(/^\/api/, '')] ?? {};
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
}

const ROUTES = [
  '/',
  '/posts',
  '/posts/post-0',
  '/notes',
  '/notes/note-0',
  '/sources',
  '/sources/source-0',
];

/** 320px is the support floor, 640px is where the header and the search row change shape. */
const WIDTHS = [320, 640, 1280];

test.describe('페이지 가로 스크롤', () => {
  for (const width of WIDTHS) {
    test(`${width}px에서는 어떤 route도 가로로 밀리지 않는다`, async ({
      page,
    }) => {
      await serveFixtures(page);
      await page.setViewportSize({ width, height: 900 });

      for (const route of ROUTES) {
        await page.goto(route);
        await page.evaluate(() => document.fonts.ready);

        expect(await horizontalOverflow(page), route).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe('Posts archive 검색창', () => {
  test('320px에서도 검색어를 입력할 수 있다', async ({ page }) => {
    await serveFixtures(page);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/posts');

    await page.getByRole('searchbox').fill('fractal');

    await expect(page.getByRole('searchbox')).toHaveValue('fractal');
  });
});
