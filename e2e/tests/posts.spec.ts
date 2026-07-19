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

test('포스트 목록에서 검색어를 입력하면 일치하는 포스트만 표시된다', async ({
  page,
  apiBaseUrl,
}) => {
  const matchingTitle = `TypeScript 입문 ${randomUUID()}`;
  const otherTitle = `파이썬 데이터 분석 ${randomUUID()}`;

  for (const title of [matchingTitle, otherTitle]) {
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
  }

  await page.goto('/posts');

  await page.getByRole('searchbox').fill('TypeScript');

  await expect(page.getByText(matchingTitle)).toBeVisible();
  await expect(page.getByText(otherTitle)).not.toBeVisible();
});

test('포스트 목록에서 검색어를 지우면 전체 목록으로 돌아온다', async ({
  page,
  apiBaseUrl,
}) => {
  const title = `E2E 검색 복귀 테스트 ${randomUUID()}`;
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

  await page.getByRole('searchbox').fill('일치하지않는검색어xyz');
  await expect(page.getByText(title)).not.toBeVisible();

  await page.getByRole('searchbox').clear();
  await expect(page.getByText(title)).toBeVisible();
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
