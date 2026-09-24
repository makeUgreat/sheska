import { expect, test, type Page } from '@playwright/test';

const NOW = '2026-01-01T00:00:00.000Z';

/** Section titles come from note headings, so one that outruns the outline is ordinary. */
const BODY = [
  '발행된 글은 노트와 같은 markdown 본문을 그대로 싣는다.',
  '',
  '## 문서 구조를 한눈에 파악하기 위한 아주 길고 장황한 섹션 제목',
  '',
  '한 섹션은 본문 몇 문단과 그 아래 하위 섹션으로 이어진다.',
  '',
  '### A deliberately long English subsection heading that no outline width will hold',
  '',
  '- 목록 항목 하나',
  '- 목록 항목 둘',
  '',
  '## 설계',
  '',
  '`--spacing-measure`는 읽기 컬럼의 상한이고, 목차는 그 옆에 남는 여백을 쓴다.',
  '',
  '## 결론',
  '',
  '마지막 섹션이다.',
].join('\n');

const POST = {
  postId: 'post-outline',
  sourceId: 'source-outline',
  title: '목차가 본문 옆에 서는 방법',
  viewCount: 128,
  createdAt: NOW,
  updatedAt: NOW,
  body: BODY,
};

async function preparePostDetail(page: Page, width: number) {
  await page.route('**/api/posts/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(POST),
    });
  });

  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/posts/${POST.postId}`);
  await page.getByRole('heading', { name: POST.title }).waitFor();
  await page.evaluate(() => document.fonts.ready);
}

function outline(page: Page) {
  return page.getByRole('navigation', { name: 'On this page' });
}

function outlineMetrics(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="On this page"]');
    const panel = nav?.querySelector(':scope > div');
    const article = document.querySelector('article');
    if (!panel || !article) throw new Error('the outline is not rendered');

    const panelBox = panel.getBoundingClientRect();
    const articleBox = article.getBoundingClientRect();
    const links = [...panel.querySelectorAll('a')];

    return {
      panelWidth: Math.round(panelBox.width),
      gapFromArticle: Math.round(panelBox.left - articleBox.right),
      lines: links.map((link) =>
        Math.round(
          link.getBoundingClientRect().height /
            parseFloat(getComputedStyle(link).lineHeight),
        ),
      ),
      clipped: links.filter((link) => link.scrollWidth > link.clientWidth + 1)
        .length,
      fullTextKept: links.every((link) => link.title === link.textContent),
    };
  });
}

/**
 * The outline only appears from `--breakpoint-toc`, which is derived from the
 * narrowest panel the margin must hold. Below it the margin cannot take the
 * panel without covering the body, so the outline is not shown at all.
 *
 * The widths below are viewport widths, and the outline measures the viewport
 * minus the reserved scrollbar gutter (`scrollbar-gutter: stable`), so the panel
 * is a few pixels narrower than the arithmetic on the raw width suggests.
 */
test.describe('TableOfContents 배치', () => {
  test.skip(({ isMobile }) => !!isMobile, '목차는 toc 폭 이상에서만 나타난다');

  test('본문에서 gutter만큼 떨어져 선다', async ({ page }) => {
    for (const [width, expected] of [
      [1200, 205],
      [1280, 245],
      [1440, 320],
      [1920, 320],
    ]) {
      await preparePostDetail(page, width);

      const { panelWidth, gapFromArticle } = await outlineMetrics(page);

      expect(panelWidth, `${width}px`).toBe(expected);
      expect(gapFromArticle, `${width}px`).toBe(24);
    }
  });

  test('1200px 미만에서는 목차를 두지 않는다', async ({ page }) => {
    for (const width of [1024, 1199]) {
      await preparePostDetail(page, width);
      await expect(outline(page), `${width}px`).toBeHidden();
    }

    await preparePostDetail(page, 1200);
    await expect(outline(page)).toBeVisible();
  });

  test('어떤 폭에서도 항목은 한 줄을 넘지 않는다', async ({ page }) => {
    for (const width of [1200, 1280, 1440, 1920]) {
      await preparePostDetail(page, width);

      const { lines, clipped, fullTextKept } = await outlineMetrics(page);

      expect([...new Set(lines)], `${width}px`).toEqual([1]);
      expect(clipped, `${width}px`).toBeGreaterThan(0);
      expect(fullTextKept, `${width}px`).toBe(true);
    }
  });
});
