import { describe, expect, it } from 'vitest';
import { computeDeadline, effectiveTimeoutMs, remainingMs } from '../deadline';

describe('computeDeadline', () => {
  it('now로부터 deadlineMs만큼 이후의 시각을 deadlineAt으로 반환한다', () => {
    const deadline = computeDeadline(5000, 1000);

    expect(deadline).toEqual({ deadlineAt: 6000 });
  });
});

describe('remainingMs', () => {
  it('deadlineAt까지 남은 밀리초를 반환한다', () => {
    const deadline = computeDeadline(5000, 1000);

    expect(remainingMs(deadline, 4000)).toBe(2000);
  });

  it('deadline을 이미 지났으면 음수를 반환한다', () => {
    const deadline = computeDeadline(5000, 1000);

    expect(remainingMs(deadline, 7000)).toBe(-1000);
  });
});

describe('effectiveTimeoutMs', () => {
  it('남은 시간이 attemptTimeoutMs보다 크면 attemptTimeoutMs를 반환한다', () => {
    const deadline = computeDeadline(60_000, 0);

    expect(effectiveTimeoutMs(deadline, 5000, 1000)).toBe(5000);
  });

  it('남은 시간이 attemptTimeoutMs보다 작으면 남은 시간을 반환한다', () => {
    const deadline = computeDeadline(3000, 0);

    expect(effectiveTimeoutMs(deadline, 5000, 1000)).toBe(2000);
  });

  it('deadline을 이미 지났으면 음수 대신 0을 반환한다', () => {
    const deadline = computeDeadline(3000, 0);

    expect(effectiveTimeoutMs(deadline, 5000, 5000)).toBe(0);
  });
});
