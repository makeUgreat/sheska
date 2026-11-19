import { InvariantViolationError } from '@core/errors';
import { describe, expect, it } from 'vitest';
import { ApiTokenPermissions } from '../api-token-permissions.vo';
import { Permission } from '../permission';

describe('ApiTokenPermissions', () => {
  it('같은 권한은 한 번만 남긴다', () => {
    const permissions = ApiTokenPermissions.of([
      'posts:publish',
      'sources:sync',
      'posts:publish',
    ]);

    expect(permissions.unpack()).toEqual(['posts:publish', 'sources:sync']);
  });

  it('가진 권한만 허락한다', () => {
    const permissions = ApiTokenPermissions.of(['sources:sync']);

    expect(permissions.grants(Permission.SOURCES_SYNC)).toBe(true);
    expect(permissions.grants(Permission.SOURCES_READ)).toBe(false);
  });

  it.each([
    ['권한이 없으면', []],
    ['없는 권한이 있으면', ['sources:sync', 'sources:delete']],
  ])('%s 만들 수 없다', (_, values) => {
    expect(() => ApiTokenPermissions.of(values)).toThrow(
      expect.objectContaining({
        constructor: InvariantViolationError,
        code: 'api_token.invalid_permissions',
      }),
    );
  });
});
