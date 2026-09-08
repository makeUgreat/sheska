import { describe, expect, it, vi } from 'vitest';
import { computeDeadline } from '@core/deadline';
import {
  withRetryAttempts as executeRetryAttempts,
  type RetryPolicy,
  type RetryRuntime,
} from '../retry';
import { classifyInfrastructureRetry } from '../retry-error.classifier';

function buildPolicy(overrides: Partial<RetryPolicy> = {}): RetryPolicy {
  return {
    maxRetries: 2,
    baseDelayMs: 100,
    maxDelayMs: 1_000,
    classify: classifyInfrastructureRetry,
    ...overrides,
  };
}

interface TestRetryOptions {
  readonly deadline: Parameters<typeof executeRetryAttempts>[1]['deadline'];
  readonly policy: RetryPolicy;
  readonly classify?: RetryPolicy['classify'];
  readonly now?: RetryRuntime['now'];
  readonly sleep?: RetryRuntime['sleep'];
  readonly random?: RetryRuntime['random'];
}

function withRetryAttempts<T>(
  operation: (attempt: number) => Promise<T>,
  options: TestRetryOptions,
): Promise<T> {
  return executeRetryAttempts(
    operation,
    {
      deadline: options.deadline,
      policy: {
        ...options.policy,
        classify: options.classify ?? options.policy.classify,
      },
    },
    {
      now: options.now ?? Date.now,
      sleep: options.sleep ?? (() => Promise.resolve()),
      random: options.random ?? Math.random,
    },
  );
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

describe('withRetryAttempts', () => {
  it('첫 시도에 성공하면 operation을 한 번만 호출한다', async () => {
    const clock = buildClock();
    const operation = vi.fn().mockResolvedValue('ok');

    const result = await withRetryAttempts(operation, {
      deadline: computeDeadline(60_000, clock.now()),
      policy: buildPolicy(),
      now: clock.now,
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledOnce();
    expect(operation).toHaveBeenCalledWith(0);
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

    const result = await withRetryAttempts(operation, {
      deadline: computeDeadline(60_000, clock.now()),
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
      withRetryAttempts(operation, {
        deadline: computeDeadline(60_000, clock.now()),
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
      withRetryAttempts(operation, {
        deadline: computeDeadline(60_000, clock.now()),
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

    await withRetryAttempts(operation, {
      deadline: computeDeadline(60_000, clock.now()),
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
      withRetryAttempts(operation, {
        deadline: computeDeadline(50, clock.now()),
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

    const result = await withRetryAttempts(operation, {
      deadline: computeDeadline(-1_000, clock.now()),
      policy: buildPolicy(),
      now: clock.now,
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledOnce();
  });
});
