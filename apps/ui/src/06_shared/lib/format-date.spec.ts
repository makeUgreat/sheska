import { describe, it, expect } from 'vitest';
import { formatDate } from './format-date';

describe('formatDate', () => {
  it('ISO 날짜 문자열을 짧은 월 이름 형식으로 표시한다', () => {
    expect(formatDate('2026-09-21T12:00:00.000Z')).toBe('Sep 21, 2026');
  });

  it('한 자리 일자는 0을 붙이지 않는다', () => {
    expect(formatDate('2026-01-05T12:00:00.000Z')).toBe('Jan 5, 2026');
  });
});
