import { describe, expect, it } from 'vitest';
import { applyFullJitter } from '../jitter';

describe('applyFullJitter', () => {
  it('random이 0이면 지연 시간은 0이다', () => {
    expect(applyFullJitter(1_000, () => 0)).toBe(0);
  });

  it('random이 1이면 delayMs를 그대로 반환한다', () => {
    expect(applyFullJitter(1_000, () => 1)).toBe(1_000);
  });

  it('random(0, delayMs) 범위의 값을 반환한다', () => {
    expect(applyFullJitter(1_000, () => 0.5)).toBe(500);
  });
});
