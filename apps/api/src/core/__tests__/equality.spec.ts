import { describe, expect, it } from 'vitest';
import { isDeepEqual } from '../equality';

describe('isDeepEqual', () => {
  it('중첩된 객체의 키 순서는 비교하지 않는다', () => {
    expect(
      isDeepEqual(
        { a: 1, b: { y: 1, x: [{ q: 1, p: 2 }] } },
        { b: { x: [{ p: 2, q: 1 }], y: 1 }, a: 1 },
      ),
    ).toBe(true);
  });

  it('배열의 순서는 비교한다', () => {
    expect(isDeepEqual({ tags: [1, 2] }, { tags: [2, 1] })).toBe(false);
  });

  it('값의 타입까지 비교한다', () => {
    expect(isDeepEqual({ a: 1 }, { a: '1' })).toBe(false);
  });
});
