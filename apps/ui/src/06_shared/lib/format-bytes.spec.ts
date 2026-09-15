import { describe, it, expect } from 'vitest';
import { formatBytes } from './format-bytes';

describe('formatBytes', () => {
  it('1024바이트 미만도 KB 단위 소수점 1자리로 표시한다', () => {
    expect(formatBytes(14)).toBe('0.1 KB');
  });

  it('bytes가 0보다 크면 반올림해도 0.0이 되지 않고 최소 0.1로 표시한다', () => {
    expect(formatBytes(1)).toBe('0.1 KB');
  });

  it('bytes가 0이면 0.0으로 표시한다', () => {
    expect(formatBytes(0)).toBe('0.0 KB');
  });

  it('1024바이트 이상은 KB 단위로 표시한다', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('1024 KB 이상은 MB 단위로 표시한다', () => {
    expect(formatBytes(1024 * 1024 * 3)).toBe('3.0 MB');
  });
});
