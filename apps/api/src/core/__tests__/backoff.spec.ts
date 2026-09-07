import { describe, expect, it } from 'vitest';
import { computeExponentialBackoffMs } from '../backoff';

describe('computeExponentialBackoffMs', () => {
  it('attempt가 커질수록 baseDelayMs * 2 ** attempt로 지수적으로 증가한다', () => {
    expect(computeExponentialBackoffMs(0, 250, 2_000)).toBe(250);
    expect(computeExponentialBackoffMs(1, 250, 2_000)).toBe(500);
    expect(computeExponentialBackoffMs(2, 250, 2_000)).toBe(1_000);
  });

  it('baseDelayMs * 2 ** attempt가 maxDelayMs를 초과하면 maxDelayMs에서 clamp된다', () => {
    expect(computeExponentialBackoffMs(10, 250, 2_000)).toBe(2_000);
  });
});
