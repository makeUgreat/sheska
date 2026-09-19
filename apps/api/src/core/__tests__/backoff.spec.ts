import { describe, expect, it } from 'vitest';
import { computeExponentialBackoffMs, computeRetryDelayMs } from '../backoff';

const POLICY = { baseDelayMs: 250, maxDelayMs: 2_000 };

describe('computeExponentialBackoffMs', () => {
  it('attemptIndex가 커질수록 baseDelayMs * 2 ** attemptIndex로 지수적으로 증가한다', () => {
    expect(computeExponentialBackoffMs(0, 250, 2_000)).toBe(250);
    expect(computeExponentialBackoffMs(1, 250, 2_000)).toBe(500);
    expect(computeExponentialBackoffMs(2, 250, 2_000)).toBe(1_000);
  });

  it('baseDelayMs * 2 ** attemptIndex가 maxDelayMs를 초과하면 maxDelayMs에서 clamp된다', () => {
    expect(computeExponentialBackoffMs(10, 250, 2_000)).toBe(2_000);
  });
});

describe('computeRetryDelayMs', () => {
  it('지수 backoff에 full jitter를 적용한 값을 돌려준다', () => {
    expect(computeRetryDelayMs(1, POLICY, () => 1)).toBe(500);
    expect(computeRetryDelayMs(1, POLICY, () => 0.5)).toBe(250);
    expect(computeRetryDelayMs(1, POLICY, () => 0)).toBe(0);
  });

  it('jitter를 적용하기 전에 maxDelayMs에서 clamp한다', () => {
    expect(computeRetryDelayMs(10, POLICY, () => 1)).toBe(2_000);
  });
});
