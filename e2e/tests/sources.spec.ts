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

test('게시된 소스는 목록에서 배지로 표시되고 상세 페이지에서 게시된 포스트로 이동할 수 있다', async ({
  page,
  apiBaseUrl,
}) => {
  const title = `E2E 게시 표시 테스트 ${randomUUID()}`;
  const externalSourceId = `e2e-${randomUUID()}`;

  const sourceRes = await fetch(`${apiBaseUrl}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      externalSourceId,
      content: `---\ntitle: ${title}\n---\nE2E 테스트 내용`,
    }),
  });
  expect(sourceRes.status).toBe(201);
  const { sourceId } = (await sourceRes.json()) as { sourceId: string };

  const postRes = await fetch(`${apiBaseUrl}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId }),
  });
  expect(postRes.status).toBe(201);
  const { postId } = (await postRes.json()) as { postId: string };

  await page.goto('/sources');

  const row = page.getByRole('listitem').filter({ hasText: externalSourceId });
  await expect(row.getByText('게시됨')).toBeVisible();

  await page.goto(`/sources/${sourceId}`);

  await page.getByRole('link', { name: '게시된 포스트 보기' }).click();

  await expect(page).toHaveURL(`/posts/${postId}`);
  await expect(page.locator('h1', { hasText: title })).toBeVisible();
});

// 테스트 런타임의 EMBEDDING_BASE_URL은 존재하지 않는 호스트를 가리키고
// embed-request 큐는 재시도 없이 1회만 시도하므로, 임베딩은 항상 결정적으로 실패한다.
// 이 테스트는 실제 API가 내려주는 sync job 상태(및 sync job id)가
// 브라우저 화면에 그대로 반영되는지를 검증한다.
test('업로드된 소스의 sync job 상태가 실제 API 값을 반영해 화면에 표시된다', async ({
  page,
  apiBaseUrl,
}) => {
  const externalSourceId = `e2e-${randomUUID()}`;
  const content = `E2E sync job 테스트 내용 ${randomUUID()}`;

  const res = await fetch(`${apiBaseUrl}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ externalSourceId, content }),
  });
  expect(res.status).toBe(201);
  const { sourceId, syncJobId } = (await res.json()) as {
    sourceId: string;
    syncJobId: string;
  };
  expect(syncJobId).toBeTruthy();

  await page.goto(`/sources/${sourceId}`);

  await expect(page.getByText('failed')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(syncJobId)).toBeVisible();
});
