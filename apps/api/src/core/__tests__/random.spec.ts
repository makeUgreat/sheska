import { describe, expect, it } from 'vitest';
import { randomBase64Url } from '../random';

describe('randomBase64Url', () => {
  it('바이트 수에 맞는 길이의 base64url 글자를 만든다', () => {
    expect(randomBase64Url(32)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('부를 때마다 다른 값을 만든다', () => {
    expect(randomBase64Url(32)).not.toBe(randomBase64Url(32));
  });
});
