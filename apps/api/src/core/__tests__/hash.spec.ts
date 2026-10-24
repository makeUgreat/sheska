import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../hash';

describe('sha256Hex', () => {
  it('text의 SHA-256을 소문자 hex로 반환한다', () => {
    expect(sha256Hex('hello')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('text를 UTF-8 바이트로 해시한다', () => {
    expect(sha256Hex('안녕')).toBe(
      'e8f817f346d1d411cc59d5bdda64fab3763890e1f0f8f4c15805cf78874d68bf',
    );
  });
});
