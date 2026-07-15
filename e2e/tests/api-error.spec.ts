import { expect, test } from '../support/fixtures';

// API 호출을 abort하여 연결 실패를 시뮬레이션한다.
// 이는 응답 데이터를 mock하는 것이 아니라 브라우저 수준의 연결 실패를 재현하는 것으로,
// 실제 API 서버가 다운된 상황과 동일한 브라우저 동작을 유발한다.
// 브라우저는 vite preview를 통해 /api/* 경로로 API를 호출하므로 해당 경로를 abort한다.
test('API가 응답하지 않을 때 에러 메시지가 화면에 표시된다', async ({
  page,
}) => {
  await page.route('**/api/**', (route) => route.abort());

  await page.goto('/sources');

  await expect(page.getByRole('alert')).toBeVisible({ timeout: 30_000 });
});
