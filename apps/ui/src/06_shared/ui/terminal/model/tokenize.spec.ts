import { describe, expect, it } from 'vitest';
import { commonPrefix, tokenize } from './tokenize';

describe('tokenize', () => {
  it('공백 여러 개를 구분자 하나로 본다', () => {
    expect(tokenize('  grep   redis  세션 ')).toEqual(['grep', 'redis', '세션']);
  });

  it('빈 줄이면 빈 목록을 돌려준다', () => {
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('commonPrefix', () => {
  it('모든 값이 공유하는 앞부분을 돌려준다', () => {
    expect(commonPrefix(['Redis 세션', 'Redis 큐'])).toBe('Redis ');
  });

  it('값이 없으면 빈 문자열을 돌려준다', () => {
    expect(commonPrefix([])).toBe('');
  });
});
