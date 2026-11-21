import { describe, it, expect } from 'vitest';
import { formatDate, formatDottedDate, formatDottedMonthDay, formatMonthDay, formatTime } from './format-date';

describe('formatDate', () => {
  it('ISO 날짜 문자열을 짧은 월 이름 형식으로 표시한다', () => {
    expect(formatDate('2026-09-21T12:00:00.000Z')).toBe('Sep 21, 2026');
  });

  it('한 자리 일자는 0을 붙이지 않는다', () => {
    expect(formatDate('2026-01-05T12:00:00.000Z')).toBe('Jan 5, 2026');
  });
});

describe('formatMonthDay', () => {
  it('연도 없이 월과 두 자리 일자만 표시한다', () => {
    expect(formatMonthDay('2026-01-05T12:00:00.000Z')).toBe('Jan 05');
  });
});

describe('formatDottedDate', () => {
  it('연도, 두 자리 월, 두 자리 일을 점으로 잇는다', () => {
    expect(formatDottedDate('2026-01-05T12:00:00.000Z')).toBe('2026.01.05');
  });
});

describe('formatDottedMonthDay', () => {
  it('두 자리 월과 두 자리 일을 점으로 잇는다', () => {
    expect(formatDottedMonthDay(new Date(2026, 0, 5, 12).toISOString())).toBe('01.05');
  });
});

describe('formatTime', () => {
  it('24시간제 두 자리 시와 분을 잇는다', () => {
    expect(formatTime(new Date(2026, 0, 5, 9, 7).toISOString())).toBe('09:07');
    expect(formatTime(new Date(2026, 0, 5, 21, 40).toISOString())).toBe('21:40');
  });
});
