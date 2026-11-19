import { InvariantViolationError } from '@core/errors';
import { describe, expect, it } from 'vitest';
import { ApiTokenName } from '../api-token-name.vo';

describe('ApiTokenName', () => {
  it.each(['macbook', 'a', 'obsidian-2', '9lives', 'a'.repeat(32)])('%s는 이름으로 쓸 수 있다', (value) => {
    expect(ApiTokenName.of(value).unpack()).toBe(value);
  });

  it('앞뒤 공백을 지운다', () => {
    expect(ApiTokenName.of('  macbook ').unpack()).toBe('macbook');
  });

  it.each(['', 'MacBook', 'my token', '-macbook', 'mac_book', 'a'.repeat(33)])('%j는 이름으로 쓸 수 없다', (value) => {
    expect(() => ApiTokenName.of(value)).toThrow(
      expect.objectContaining({
        constructor: InvariantViolationError,
        code: 'api_token.invalid_name',
      }),
    );
  });
});
