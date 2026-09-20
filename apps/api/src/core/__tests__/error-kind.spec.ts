import { describe, expect, it } from 'vitest';
import { ERROR_KIND } from '../error-kind';

describe('ERROR_KIND', () => {
  it('서로 다른 이름이 같은 값을 갖지 않는다', () => {
    const values = Object.values(ERROR_KIND);

    expect(new Set(values).size).toBe(values.length);
  });
});
