import { describe, expect, it } from 'vitest';

describe('CI 관문 시험', () => {
  it('일부러 실패해서 머지가 막히는지 본다', () => {
    expect(1).toBe(2);
  });
});
