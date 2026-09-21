import { describe, it, expect } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('공백을 하이픈으로 바꾸고 소문자로 만든다', () => {
    expect(slugify('Getting Started')).toBe('getting-started');
  });

  it('앞뒤 공백을 제거한다', () => {
    expect(slugify('  Getting Started  ')).toBe('getting-started');
  });

  it('문자, 숫자, 하이픈이 아닌 기호를 제거한다', () => {
    expect(slugify('What is FSD? (v1)')).toBe('what-is-fsd-v1');
  });

  it('연속된 하이픈을 하나로 합친다', () => {
    expect(slugify('Design -- Tokens')).toBe('design-tokens');
  });

  it('영문이 아닌 문자도 보존한다', () => {
    expect(slugify('디자인 토큰')).toBe('디자인-토큰');
  });
});
