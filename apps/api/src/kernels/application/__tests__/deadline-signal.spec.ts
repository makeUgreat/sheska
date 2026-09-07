import { describe, expect, it } from 'vitest';
import { computeDeadline } from '@core/deadline';
import { effectiveAbortSignal } from '../deadline-signal';

describe('effectiveAbortSignal', () => {
  it('AbortSignal 인스턴스를 반환한다', () => {
    const deadline = computeDeadline(60_000);

    const signal = effectiveAbortSignal(deadline, 1000);

    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
  });

  it('남은 시간이 attemptTimeoutMs보다 짧으면 그 남은 시간만큼만 지나면 abort된다', async () => {
    const deadline = computeDeadline(20);

    const signal = effectiveAbortSignal(deadline, 10_000);

    expect(signal.aborted).toBe(false);
    await new Promise((resolve) =>
      signal.addEventListener('abort', resolve, { once: true }),
    );
    expect(signal.aborted).toBe(true);
  });

  it('deadline을 이미 지났으면 거의 즉시 abort된다', async () => {
    const deadline = computeDeadline(-1000);

    const signal = effectiveAbortSignal(deadline, 10_000);

    await new Promise((resolve) =>
      signal.addEventListener('abort', resolve, { once: true }),
    );
    expect(signal.aborted).toBe(true);
  });
});
