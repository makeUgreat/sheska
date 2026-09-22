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
  title: 'Article outline이 본문 옆에 서는 방법',
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

function panel(page: Page) {
  return outline(page).locator('> div');
}

/**
 * The collapsed rail sits under the panel, which is transparent to the pointer
 * until it opens. Playwright's own hover refuses that, because it re-checks the
 * hit target after the panel has opened over it.
 */
async function openOutline(page: Page) {
  const rail = outline(page).locator('ul[aria-hidden="true"]');
  const box = await rail.boundingBox();
  if (!box) throw new Error('the collapsed rail is not on screen');
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2);
  await expect(panel(page)).toHaveCSS('opacity', '1');
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
 * The margin beside the reading column is what the outline measures itself
 * against, and it only exists past `lg`. A phone never gets that far.
 *
 * The widths below are viewport widths, and the outline measures the viewport
 * minus the reserved scrollbar gutter (`scrollbar-gutter: stable`). So the panel
 * stops shrinking about 15px earlier than the numbers suggest: at 1199px it is
 * already clear of the body, and the overlap belongs to widths near 1100px.
 * `--breakpoint-toc` is a separate, media-query boundary: it decides whether the
 * outline needs a hover, not how wide it is.
 */
test.describe('Article outline 배치', () => {
  test.skip(({ isMobile }) => !!isMobile, '목차는 lg 이상에서만 나타난다');

  test('여백이 남는 동안은 본문에서 gutter만큼 떨어져 선다', async ({
    page,
  }) => {
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

  test('여백이 모자라면 하한 폭을 지키고 본문 위로 올라선다', async ({
    page,
  }) => {
    await preparePostDetail(page, 1100);
    await openOutline(page);

    const { panelWidth, gapFromArticle } = await outlineMetrics(page);

    expect(panelWidth).toBe(200);
    expect(gapFromArticle).toBeLessThan(0);
  });

  test('1199px과 1200px 사이에서는 폭이 아니라 펼치는 수단이 바뀐다', async ({
    page,
  }) => {
    await preparePostDetail(page, 1199);
    await expect(panel(page)).toHaveCSS('opacity', '0');
    const below = await outlineMetrics(page);

    await preparePostDetail(page, 1200);
    await expect(panel(page)).toHaveCSS('opacity', '1');
    const above = await outlineMetrics(page);

    expect(Math.abs(above.panelWidth - below.panelWidth)).toBeLessThanOrEqual(
      1,
    );
    expect(below.gapFromArticle).toBe(24);
    expect(above.gapFromArticle).toBe(24);
  });

  test('어떤 폭에서도 항목은 한 줄을 넘지 않는다', async ({ page }) => {
    for (const width of [1024, 1199, 1200, 1280, 1440, 1920]) {
      await preparePostDetail(page, width);
      if (width < 1200) await openOutline(page);

      const { lines, clipped, fullTextKept } = await outlineMetrics(page);

      expect([...new Set(lines)], `${width}px`).toEqual([1]);
      expect(clipped, `${width}px`).toBeGreaterThan(0);
      expect(fullTextKept, `${width}px`).toBe(true);
    }
  });

  test('접힌 목차는 그 아래 본문을 가리지 않는다', async ({ page }) => {
    await preparePostDetail(page, 1100);

    const reachable = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="On this page"]');
      const article = document.querySelector('article');
      if (!nav || !article) throw new Error('the outline is not rendered');

      const navBox = nav.getBoundingClientRect();
      const paragraph = [...article.querySelectorAll('p')].find((node) => {
        const box = node.getBoundingClientRect();
        return box.top > navBox.top && box.right > navBox.left;
      });
      if (!paragraph) throw new Error('no paragraph runs under the outline');

      const box = paragraph.getBoundingClientRect();
      const hit = document.elementFromPoint(box.right - 2, box.top + 6);
      return hit === paragraph || paragraph.contains(hit);
    });

    expect(reachable).toBe(true);
  });
});
