import { describe, expect, it } from 'vitest';
import { type Permission } from '@contexts/iam/domain';
import { type Identity } from '../authenticate-request.use-case';
import { AuthorizeRequestUseCase } from '../authorize-request.use-case';

const OWNER: Identity = {
  permissions: [
    'sources:sync',
    'sources:read',
    'posts:publish',
    'api_tokens:manage',
  ],
};
const SYNC_TOKEN: Identity = { permissions: ['sources:sync'] };

const useCase = new AuthorizeRequestUseCase();

function authorize(identity: Identity, permission: Permission) {
  return () => useCase.execute({ identity, permission });
}

describe('AuthorizeRequestUseCase', () => {
  it.each([
    'sources:sync',
    'sources:read',
    'posts:publish',
    'api_tokens:manage',
  ] as const)('모든 권한을 가지면 %s를 만족한다', (permission) => {
    expect(authorize(OWNER, permission)).not.toThrow();
  });

  it('가진 권한은 만족한다', () => {
    expect(authorize(SYNC_TOKEN, 'sources:sync')).not.toThrow();
  });

  it.each(['sources:read', 'posts:publish', 'api_tokens:manage'] as const)(
    '%s 권한이 없으면 403 auth.forbidden이다',
    (permission) => {
      expect(authorize(SYNC_TOKEN, permission)).toThrow(
        expect.objectContaining({ kind: 'forbidden', code: 'auth.forbidden' }),
      );
    },
  );
});
