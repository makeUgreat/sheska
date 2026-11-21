import { describe, it, expect } from 'vitest';
import { formatWinterGreeting, formatWinterStatus } from './winter-status';

describe('formatWinterStatus', () => {
  it('크리스마스 100일 전부터 남은 날을 센다', () => {
    expect(formatWinterStatus(new Date(2026, 8, 16), 'christmas')).toBe('100 days to christmas');
    expect(formatWinterStatus(new Date(2026, 10, 22), 'christmas')).toBe('33 days to christmas');
  });

  it('하루 남으면 day를 단수로 쓴다', () => {
    expect(formatWinterStatus(new Date(2026, 11, 24), 'christmas')).toBe('1 day to christmas');
  });

  it('크리스마스 당일에는 인사를 쓴다', () => {
    expect(formatWinterStatus(new Date(2026, 11, 25), 'christmas')).toBe('merry christmas');
  });

  it('크리스마스가 100일보다 많이 남으면 겨울 문구를 쓴다', () => {
    expect(formatWinterStatus(new Date(2026, 8, 15), 'christmas')).toBe('long nights, warm tea');
  });

  it('크리스마스 다음 날부터는 다음 해 크리스마스를 세므로 겨울 문구를 쓴다', () => {
    expect(formatWinterStatus(new Date(2026, 11, 26), 'christmas')).toBe('long nights, warm tea');
    expect(formatWinterStatus(new Date(2027, 0, 1), 'christmas')).toBe('long nights, warm tea');
  });

  it('시각과 상관없이 날짜로 센다', () => {
    expect(formatWinterStatus(new Date(2026, 11, 24, 23, 59), 'christmas')).toBe('1 day to christmas');
    expect(formatWinterStatus(new Date(2026, 11, 25, 0, 1), 'christmas')).toBe('merry christmas');
  });

  it('줄임말을 받으면 christmas 자리에 줄임말을 쓴다', () => {
    expect(formatWinterStatus(new Date(2026, 10, 22), 'xmas')).toBe('33 days to xmas');
    expect(formatWinterStatus(new Date(2026, 11, 24), 'xmas')).toBe('1 day to xmas');
    expect(formatWinterStatus(new Date(2026, 11, 25), 'xmas')).toBe('merry xmas');
  });
});

describe('formatWinterGreeting', () => {
  it('크리스마스 당일까지는 크리스마스 인사를 쓴다', () => {
    expect(formatWinterGreeting(new Date(2026, 8, 16))).toBe('Merry Christmas.');
    expect(formatWinterGreeting(new Date(2026, 11, 25))).toBe('Merry Christmas.');
  });

  it('크리스마스 다음 날부터는 겨울 인사를 쓴다', () => {
    expect(formatWinterGreeting(new Date(2026, 11, 26))).toBe('Stay warm.');
  });
});
