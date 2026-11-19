import { sha256Hex } from '@core/hash';
import { describe, expect, it } from 'vitest';
import { ApiTokenSecret } from '../api-token-secret.vo';

describe('ApiTokenSecret', () => {
  it('shk_ 뒤에 32바이트 base64url을 붙인다', () => {
    const secret = ApiTokenSecret.generate().unpack();

    expect(secret).toMatch(/^shk_[A-Za-z0-9_-]{43}$/);
  });

  it('만들 때마다 다른 원문을 만든다', () => {
    expect(ApiTokenSecret.generate().unpack()).not.toBe(ApiTokenSecret.generate().unpack());
  });

  it('hash는 원문의 SHA-256이다', () => {
    const secret = ApiTokenSecret.of('shk_abcdef');

    expect(secret.hash()).toBe(sha256Hex('shk_abcdef'));
  });

  it('hint는 접두사와 그 뒤 4글자다', () => {
    expect(ApiTokenSecret.of('shk_Ab3dXYZ').hint()).toBe('shk_Ab3d');
  });
});
