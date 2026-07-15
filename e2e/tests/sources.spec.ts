import { randomUUID } from 'node:crypto';
import { expect, test } from '../support/fixtures';

test('업로드된 소스가 목록에 표시되고 상세 페이지에서 내용을 확인한 뒤 목록으로 돌아올 수 있다', async ({
  page,
  apiBaseUrl,
}) => {
  const externalSourceId = `e2e-${randomUUID()}`;
  const content = `E2E 테스트 내용 ${randomUUID()}`;

  const res = await fetch(`${apiBaseUrl}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ externalSourceId, content }),
  });
  expect(res.status).toBe(201);

  await page.goto('/sources');

  const link = page.getByRole('link', { name: externalSourceId });
  await expect(link).toBeVisible();

  await link.click();

  await expect(
    page.getByRole('heading', { name: externalSourceId }),
  ).toBeVisible();
  await expect(page.locator('pre')).toContainText(content);

  await page.getByRole('link', { name: /back to sources/i }).click();
  await expect(page).toHaveURL('/sources');
});
