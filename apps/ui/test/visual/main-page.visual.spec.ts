import { expect, test, type Page } from '@playwright/test';

const NOW = '2026-01-01T00:00:00.000Z';

const POSTS = [
  {
    postId: 'post-design-systems',
    sourceId: 'source-1',
    title: 'The Fractal Nature of Design Systems',
    viewCount: 8,
    createdAt: NOW,
    updatedAt: '2024-05-24T00:00:00.000Z',
  },
  {
    postId: 'post-terminal',
    sourceId: 'source-2',
    title: 'Building a Digital Garden from the Terminal',
    viewCount: 12,
    createdAt: NOW,
    updatedAt: '2024-05-18T00:00:00.000Z',
  },
  {
    postId: 'post-refactoring',
    sourceId: 'source-3',
    title: 'The Quiet Art of Refactoring',
    viewCount: 5,
    createdAt: NOW,
    updatedAt: '2024-05-10T00:00:00.000Z',
  },
];

async function prepareMainPage(page: Page) {
  await page.route('**/api/posts**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ posts: POSTS, nextCursor: null }),
    });
  });

  await page.route('**/aida-public/**', async (route) => {
    await route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#f5f6f7"/>
        <path d="M22 138c42-55 74 20 118-32 18-22 30-27 38-30" fill="none" stroke="#e06c75" stroke-width="6"/>
        <path d="M24 156c50-48 84 12 150-46" fill="none" stroke="#8a919e" stroke-width="4"/>
        <rect x="38" y="42" width="124" height="72" fill="#ffffff" stroke="#3e4451" stroke-width="2"/>
        <text x="100" y="82" text-anchor="middle" font-family="monospace" font-size="14" fill="#101319">DIGITAL CODE</text>
      </svg>`,
    });
  });

  await page.goto('/');
  await page.getByRole('heading', { name: 'HASH' }).waitFor();
  await page.getByText('Latest Notes & Essays').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
}

test.describe('Main page visual fidelity', () => {
  test('Stitch main page layout matches the design reference', async ({
    page,
  }) => {
    await prepareMainPage(page);

    await expect(page).toHaveScreenshot('main-page.png', {
      fullPage: true,
    });
  });
});
