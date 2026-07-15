import { randomUUID } from 'node:crypto';
import { expect, test } from '../support/fixtures';

test('발행된 포스트가 목록에 제목과 함께 표시된다', async ({
  page,
  apiBaseUrl,
}) => {
  const sourceRes = await fetch(`${apiBaseUrl}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      externalSourceId: `e2e-${randomUUID()}`,
      content: `E2E 테스트 내용 ${randomUUID()}`,
    }),
  });
  expect(sourceRes.status).toBe(201);
  const { sourceId } = (await sourceRes.json()) as { sourceId: string };

  const title = `E2E 포스트 ${randomUUID()}`;
  const postRes = await fetch(`${apiBaseUrl}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId, title }),
  });
  expect(postRes.status).toBe(201);

  await page.goto('/posts');

  await expect(page.getByText(title)).toBeVisible();
});
