import { describe, it, expect } from 'vitest';
import { formatBytes } from './format-bytes';

describe('formatBytes', () => {
  it('1024바이트 미만은 bytes 단위로 표시한다', () => {
    expect(formatBytes(14)).toBe('14 bytes');
  });

  it('1024바이트 이상은 KB 단위로 표시한다', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('1024 KB 이상은 MB 단위로 표시한다', () => {
    expect(formatBytes(1024 * 1024 * 3)).toBe('3.0 MB');
  });
});
