import { describe, expect, it } from 'vitest';
import { OwnerPasswordSecretVerifier } from '../owner-password.secret.verifier';

describe('OwnerPasswordSecretVerifier', () => {
  const verifier = new OwnerPasswordSecretVerifier({
    password: 'owner-password',
  });

  it('소유자 비밀번호와 같으면 맞다', async () => {
    await expect(verifier.matches('owner-password')).resolves.toBe(true);
  });

  it('소유자 비밀번호와 다르면 틀리다', async () => {
    await expect(verifier.matches('owner-passwore')).resolves.toBe(false);
  });

  it('길이가 달라도 오류 없이 틀리다', async () => {
    await expect(verifier.matches('owner')).resolves.toBe(false);
  });
});
