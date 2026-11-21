import { expect, test, type Locator, type Page } from '@playwright/test';

const WIDTHS = [320, 375, 1280];

test.use({ baseURL: 'http://127.0.0.1:5175' });

async function serveGuestSession(page: Page) {
  await page.route(/\/api\//, async (route) => {
    const { pathname } = new URL(route.request().url());
    if (!pathname.startsWith('/api/')) return route.continue();

    const body = pathname === '/api/auth/session' ? { authenticated: false } : {};
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('element is not visible');

  return { top: rect.y, bottom: rect.y + rect.height };
}

test.describe('겨울 상태 줄', () => {
  for (const width of WIDTHS) {
    test(`${width}px에서 출력이 바닥까지 차도 상태 줄이 출력을 가리지 않는다`, async ({ page }) => {
      await serveGuestSession(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const input = page.getByLabel('guest@hash:~$');
      const scrollArea = page.getByRole('log').locator('..');
      const statusLine = page.getByText('snow on', { exact: true }).locator('xpath=ancestor::div[1]');

      for (let i = 0; i < 4; i++) {
        await input.fill('help');
        await input.press('Enter');
      }
      const overflowing = await scrollArea.evaluate((element) => element.scrollHeight > element.clientHeight);
      const status = await box(statusLine);

      expect(overflowing).toBe(true);
      expect((await box(scrollArea)).bottom).toBeLessThanOrEqual(status.top);
      expect((await box(input)).bottom).toBeLessThanOrEqual(status.top);
    });
  }
});
