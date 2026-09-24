import { expect, test, type Page } from '@playwright/test';

const NOW = '2026-01-01T00:00:00.000Z';

const BODY = [
  '본문 문단 사이의 코드 블록은 본문 간격을 쓴다.',
  '',
  '```bash',
  'pnpm install',
  '```',
  '',
  '1. 의존성을 설치한다.',
  '',
  '   ```bash',
  '   pnpm install',
  '   ```',
  '',
  '2. 설정을 바꾼다.',
].join('\n');

const POST = {
  postId: 'post-spacing',
  sourceId: 'source-spacing',
  title: '목록 안 코드 블록의 간격',
  viewCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
  body: BODY,
};

async function preparePostDetail(page: Page) {
  await page.route('**/api/posts/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(POST),
    });
  });

  await page.goto(`/posts/${POST.postId}`);
  await page.getByRole('heading', { name: POST.title }).waitFor();
  await page.evaluate(() => document.fonts.ready);
}

function spacingMetrics(page: Page) {
  return page.evaluate(() => {
    const paragraphs = [...document.querySelectorAll('article p')];
    const byText = (text: string) =>
      paragraphs.find((paragraph) => paragraph.textContent === text);

    const bodyText = byText('본문 문단 사이의 코드 블록은 본문 간격을 쓴다.');
    const itemText = byText('의존성을 설치한다.');
    const nextItemText = byText('설정을 바꾼다.');
    const topLevelBlock = bodyText?.nextElementSibling;
    const listBlock = itemText?.nextElementSibling;
    if (
      !bodyText ||
      !topLevelBlock ||
      !listBlock ||
      !itemText ||
      !nextItemText
    ) {
      throw new Error('the spacing fixture is not rendered');
    }

    const box = (element: Element) => element.getBoundingClientRect();
    return {
      bodyTextToBlock: box(topLevelBlock).top - box(bodyText).bottom,
      itemTextToBlock: box(listBlock).top - box(itemText).bottom,
      blockToNextItem: box(nextItemText).top - box(listBlock).bottom,
    };
  });
}

test.describe('Markdown 목록 안 코드 블록 간격', () => {
  test('항목 안 코드 블록은 본문 간격보다 좁게 붙는다', async ({ page }) => {
    await preparePostDetail(page);
    const metrics = await spacingMetrics(page);

    expect(metrics.blockToNextItem).toBeLessThan(metrics.bodyTextToBlock);
  });

  test('항목 안 코드 블록은 다음 항목보다 자기 항목에 가깝다', async ({
    page,
  }) => {
    await preparePostDetail(page);
    const metrics = await spacingMetrics(page);

    expect(metrics.itemTextToBlock).toBeLessThan(metrics.blockToNextItem);
  });
});
