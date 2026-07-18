import { randomUUID } from 'node:crypto';
import { expect, test } from '../support/fixtures';

test('source 상세 페이지에서 게시하기 버튼으로 포스트를 만들고 목록에서 확인할 수 있다', async ({
  page,
  apiBaseUrl,
}) => {
  const title = `E2E 포스트 ${randomUUID()}`;
  const sourceRes = await fetch(`${apiBaseUrl}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      externalSourceId: `e2e-${randomUUID()}`,
      content: `---\ntitle: ${title}\n---\nE2E 테스트 내용`,
    }),
  });
  expect(sourceRes.status).toBe(201);
  const { sourceId } = (await sourceRes.json()) as { sourceId: string };

  await page.goto(`/sources/${sourceId}`);

  await page.getByRole('button', { name: '게시하기' }).click();

  await expect(page.getByText(/포스트가 게시되었습니다/)).toBeVisible();

  await page.getByRole('link', { name: '포스트 목록 보기' }).click();

  await expect(page).toHaveURL('/posts');
  await expect(page.getByText(title)).toBeVisible();
});

test('포스트 목록에서 제목 클릭 시 상세 페이지로 이동하고 상세 정보를 확인한 뒤 목록으로 돌아올 수 있다', async ({
  page,
  apiBaseUrl,
}) => {
  const title = `E2E 포스트 ${randomUUID()}`;
  const sourceRes = await fetch(`${apiBaseUrl}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      externalSourceId: `e2e-${randomUUID()}`,
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

  await page.goto('/posts');

  await page.getByRole('link', { name: title }).click();

  await expect(page).toHaveURL(`/posts/${postId}`);
  await expect(page.locator('h1', { hasText: title })).toBeVisible();
  await expect(page.getByText(postId)).toBeVisible();
  await expect(page.getByText(sourceId)).toBeVisible();

  await page.getByRole('link', { name: /back to posts/i }).click();
  await expect(page).toHaveURL('/posts');
});

test('포스트 상세 페이지에서 제목을 수정하면 변경된 제목이 반영된다', async ({
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

  const postRes = await fetch(`${apiBaseUrl}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId }),
  });
  expect(postRes.status).toBe(201);
  const { postId } = (await postRes.json()) as { postId: string };

  await page.goto(`/posts/${postId}`);

  await page.getByRole('button', { name: /edit title/i }).click();

  const updatedTitle = `수정된 제목 ${randomUUID()}`;
  await page.getByRole('textbox').fill(updatedTitle);
  await page.getByRole('button', { name: /save/i }).click();

  await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible();
});

test('포스트 상세 페이지에서 소스 내용이 표시된다', async ({
  page,
  apiBaseUrl,
}) => {
  const content = `E2E 본문 내용 ${randomUUID()}`;
  const sourceRes = await fetch(`${apiBaseUrl}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      externalSourceId: `e2e-${randomUUID()}`,
      content,
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

  await page.goto(`/posts/${postId}`);

  await expect(page.getByText(content)).toBeVisible();
});

test('포스트 상세 페이지에서 마크다운이 HTML 요소로 렌더링된다', async ({
  page,
  apiBaseUrl,
}) => {
  const sourceRes = await fetch(`${apiBaseUrl}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      externalSourceId: `e2e-${randomUUID()}`,
      content: '# 마크다운 제목\n\n**굵은 텍스트**\n\n- 항목 하나\n- 항목 둘',
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

  await page.goto(`/posts/${postId}`);

  await expect(page.locator('h1', { hasText: '마크다운 제목' })).toBeVisible();
  await expect(
    page.locator('strong', { hasText: '굵은 텍스트' }),
  ).toBeVisible();
  await expect(page.locator('li', { hasText: '항목 하나' })).toBeVisible();
  await expect(page.locator('li', { hasText: '항목 둘' })).toBeVisible();
});

test('발행된 포스트가 목록에 제목과 함께 표시된다', async ({
  page,
  apiBaseUrl,
}) => {
  const title = `E2E 포스트 ${randomUUID()}`;
  const sourceRes = await fetch(`${apiBaseUrl}/sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      externalSourceId: `e2e-${randomUUID()}`,
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

  await page.goto('/posts');

  await expect(page.getByText(title)).toBeVisible();
});

test('포스트 목록에서 무한 스크롤로 다음 페이지를 로드한다', async ({
  page,
  apiBaseUrl,
}) => {
  const createPost = async (title: string) => {
    const sourceRes = await fetch(`${apiBaseUrl}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalSourceId: `e2e-${randomUUID()}`,
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
  };

  const prefix = `무한스크롤-${randomUUID()}`;
  const title1 = `${prefix}-1`;
  const title2 = `${prefix}-2`;
  const title3 = `${prefix}-3`;

  // Create 3 posts sequentially to ensure stable ordering
  await createPost(title1);
  await createPost(title2);
  await createPost(title3);

  // limit=2 so first page shows 2 posts, second page shows the remaining one
  await page.goto('/posts?limit=2');

  // At least 2 of the 3 posts should be visible on first page
  await expect(page.getByRole('link', { name: title3 })).toBeVisible();

  // Scroll sentinel into view to trigger infinite scroll
  await page.locator('div').last().scrollIntoViewIfNeeded();

  // After scroll, all 3 posts should eventually be visible
  await expect(page.getByRole('link', { name: title1 })).toBeVisible();
});
