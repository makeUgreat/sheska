import { describe, expect, it, vi } from 'vitest';
import { computeDeadline } from '@core/deadline';
import { withRetry, type RetryPolicy } from '../retry';

function buildPolicy(overrides: Partial<RetryPolicy> = {}): RetryPolicy {
  return { maxRetries: 2, baseDelayMs: 100, maxDelayMs: 1_000, ...overrides };
}

function buildClock(start = 0) {
  let time = start;
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe('withRetry', () => {
  it('첫 시도에 성공하면 operation을 한 번만 호출한다', async () => {
    const clock = buildClock();
    const operation = vi.fn().mockResolvedValue('ok');

    const result = await withRetry(operation, {
      deadline: computeDeadline(60_000, clock.now()),
      attemptTimeoutMs: 1_000,
      policy: buildPolicy(),
      now: clock.now,
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledOnce();
    expect(operation).toHaveBeenCalledWith({
      attempt: 0,
      signal: expect.any(AbortSignal) as AbortSignal,
    });
  });

  it('재시도 가능한 에러가 나면 backoff 후 재시도해서 결국 성공한다', async () => {
    const clock = buildClock();
    const error = new Error('transient');
    const operation = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('ok');
    const sleep = vi.fn((ms: number) => {
      clock.advance(ms);
      return Promise.resolve();
    });

    const result = await withRetry(operation, {
      deadline: computeDeadline(60_000, clock.now()),
      attemptTimeoutMs: 1_000,
      policy: buildPolicy(),
      classify: () => ({ retryable: true }),
      now: clock.now,
      sleep,
      random: () => 0,
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('maxRetries를 소진하면 마지막 에러를 rethrow한다', async () => {
    const clock = buildClock();
    const error = new Error('always fails');
    const operation = vi.fn().mockRejectedValue(error);
    const sleep = vi.fn((ms: number) => {
      clock.advance(ms);
      return Promise.resolve();
    });

    await expect(
      withRetry(operation, {
        deadline: computeDeadline(60_000, clock.now()),
        attemptTimeoutMs: 1_000,
        policy: buildPolicy({ maxRetries: 2 }),
        classify: () => ({ retryable: true }),
        now: clock.now,
        sleep,
        random: () => 0,
      }),
    ).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('재시도 불가 분류면 sleep 없이 즉시 rethrow한다', async () => {
    const clock = buildClock();
    const error = new Error('not retryable');
    const operation = vi.fn().mockRejectedValue(error);
    const sleep = vi.fn((ms: number) => {
      clock.advance(ms);
      return Promise.resolve();
    });

    await expect(
      withRetry(operation, {
        deadline: computeDeadline(60_000, clock.now()),
        attemptTimeoutMs: 1_000,
        policy: buildPolicy(),
        classify: () => ({ retryable: false }),
        now: clock.now,
        sleep,
      }),
    ).rejects.toBe(error);
    expect(operation).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('classification의 retryAfterMs가 있으면 계산된 backoff보다 우선한다', async () => {
    const clock = buildClock();
    const error = new Error('rate limited');
    const operation = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('ok');
    const sleep = vi.fn((ms: number) => {
      clock.advance(ms);
      return Promise.resolve();
    });

    await withRetry(operation, {
      deadline: computeDeadline(60_000, clock.now()),
      attemptTimeoutMs: 1_000,
      policy: buildPolicy(),
      classify: () => ({ retryable: true, retryAfterMs: 5_000 }),
      now: clock.now,
      sleep,
      random: () => 1,
    });

    expect(sleep).toHaveBeenCalledWith(5_000);
  });

  it('delay가 남은 deadline을 초과하면 sleep 없이 rethrow한다', async () => {
    const clock = buildClock();
    const error = new Error('transient');
    const operation = vi.fn().mockRejectedValue(error);
    const sleep = vi.fn((ms: number) => {
      clock.advance(ms);
      return Promise.resolve();
    });

    await expect(
      withRetry(operation, {
        deadline: computeDeadline(50, clock.now()),
        attemptTimeoutMs: 1_000,
        policy: buildPolicy({ baseDelayMs: 1_000, maxDelayMs: 1_000 }),
        classify: () => ({ retryable: true }),
        now: clock.now,
        sleep,
        random: () => 1,
      }),
    ).rejects.toBe(error);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('deadline이 이미 소진됐어도 최초 시도는 항상 실행된다', async () => {
    const clock = buildClock();
    const operation = vi.fn().mockResolvedValue('ok');

    const result = await withRetry(operation, {
      deadline: computeDeadline(-1_000, clock.now()),
      attemptTimeoutMs: 1_000,
      policy: buildPolicy(),
      now: clock.now,
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledOnce();
  });

  it('매 attempt마다 새로 bound된 AbortSignal을 만든다', async () => {
    const clock = buildClock();
    const error = new Error('transient');
    const signals: AbortSignal[] = [];
    const operation = vi.fn((attempt: { signal: AbortSignal }) => {
      signals.push(attempt.signal);
      return signals.length === 1
        ? Promise.reject(error)
        : Promise.resolve('ok');
    });
    const sleep = vi.fn((ms: number) => {
      clock.advance(ms);
      return Promise.resolve();
    });

    await withRetry(operation, {
      deadline: computeDeadline(60_000, clock.now()),
      attemptTimeoutMs: 1_000,
      policy: buildPolicy(),
      classify: () => ({ retryable: true }),
      now: clock.now,
      sleep,
      random: () => 0,
    });

    expect(signals).toHaveLength(2);
    expect(signals[0]).not.toBe(signals[1]);
  });
});
