import { afterEach, describe, expect, it, vi } from 'vitest';
import { ownerPasswordSecretConfig } from '../owner-password.secret.config';

describe('ownerPasswordSecretConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('OWNER_PASSWORD가 8자 이상이면 설정을 돌려준다', () => {
    vi.stubEnv('OWNER_PASSWORD', '12345678');

    expect(ownerPasswordSecretConfig()).toEqual({ password: '12345678' });
  });

  it.each([undefined, '', '1234567'])(
    'OWNER_PASSWORD가 %j이면 거부한다',
    (value) => {
      vi.stubEnv('OWNER_PASSWORD', value);

      expect(() => ownerPasswordSecretConfig()).toThrow('OWNER_PASSWORD');
    },
  );
});
