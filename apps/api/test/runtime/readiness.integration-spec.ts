import { describe, expect, inject, it } from 'vitest';

describe('API runtime', () => {
  it('빌드한 이미지로 띄운 API가 준비됐다고 응답한다', async () => {
    const response = await fetch(new URL('/readyz', inject('runtimeBaseUrl')));

    expect(response.status).toBe(200);
  });
});
