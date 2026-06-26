import { err, mapNullableToResult, ok } from '../result';
import { describe, expect, it } from 'vitest';

describe('mapNullableToResult', () => {
  it('null이면 ok(null)을 반환한다', () => {
    const result = mapNullableToResult(null, () => err('should_not_be_called'));

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBeNull();
  });

  it('null이 아니면 mapper의 ok 값을 반환한다', () => {
    const result = mapNullableToResult('source', (value) =>
      ok(value.toUpperCase()),
    );

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe('SOURCE');
  });

  it('mapper의 err 값을 그대로 반환한다', () => {
    const result = mapNullableToResult('source', () => err('invalid_source'));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe('invalid_source');
  });
});
