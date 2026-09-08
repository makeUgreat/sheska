import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  type CircuitBreakerPolicy,
} from '../circuit-breaker';
import { INFRASTRUCTURE_ERROR_KIND } from '../error.base';
import { InfrastructureException } from '../infrastructure.exception';

function buildPolicy(
  overrides: Partial<CircuitBreakerPolicy> = {},
): CircuitBreakerPolicy {
  return {
    failureRateThreshold: 0.5,
    evaluationWindowMs: 10_000,
    minimumRequestCount: 4,
    openDurationMs: 5_000,
    ...overrides,
  };
}

// classifyInfrastructureRetry-independent classifier for deterministic,
// self-contained tests: messages starting with "retryable" count as a
// circuit failure, everything else doesn't.
const isRetryableMessage = (error: unknown) =>
  error instanceof Error && error.message.startsWith('retryable');

async function failNTimes(
  breaker: CircuitBreaker,
  n: number,
  message = 'retryable failure',
): Promise<void> {
  for (let i = 0; i < n; i++) {
    await expect(
      breaker.execute(() => Promise.reject(new Error(message))),
    ).rejects.toThrow(message);
  }
}

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('CLOSED 상태에서는 operation을 정상 호출하고 결과를 반환한다', async () => {
    const breaker = new CircuitBreaker({
      policy: buildPolicy(),
      isFailure: isRetryableMessage,
    });
    const operation = vi.fn((isTrial: boolean) => Promise.resolve(isTrial));

    const result = await breaker.execute(operation);

    expect(result).toBe(false);
    expect(operation).toHaveBeenCalledWith(false);
    expect(breaker.state).toBe('closed');
  });

  it('minimumRequestCount 미만이면 전부 실패해도 OPEN으로 전이하지 않는다', async () => {
    const breaker = new CircuitBreaker({
      policy: buildPolicy({ minimumRequestCount: 4 }),
      isFailure: isRetryableMessage,
    });

    await failNTimes(breaker, 3);

    expect(breaker.state).toBe('closed');
  });

  it('minimumRequestCount 이상이고 실패율이 threshold 이상이면 OPEN으로 전이한다', async () => {
    const breaker = new CircuitBreaker({
      policy: buildPolicy({
        minimumRequestCount: 4,
        failureRateThreshold: 0.5,
      }),
      isFailure: isRetryableMessage,
    });

    await failNTimes(breaker, 4);

    expect(breaker.state).toBe('open');
  });

  it('성공도 volume 집계에 포함된다 (성공만으로는 열리지 않는다)', async () => {
    const breaker = new CircuitBreaker({
      policy: buildPolicy({ minimumRequestCount: 4 }),
      isFailure: isRetryableMessage,
    });

    for (let i = 0; i < 10; i++) {
      await expect(breaker.execute(() => Promise.resolve('ok'))).resolves.toBe(
        'ok',
      );
    }

    expect(breaker.state).toBe('closed');
  });

  it('OPEN 상태에서는 operation을 호출하지 않고 CircuitBreakerOpenError를 즉시 던진다', async () => {
    const breaker = new CircuitBreaker({
      policy: buildPolicy({ minimumRequestCount: 2 }),
      isFailure: isRetryableMessage,
    });
    await failNTimes(breaker, 2);
    expect(breaker.state).toBe('open');

    const operation = vi.fn(() => Promise.resolve('unreachable'));

    await expect(breaker.execute(operation)).rejects.toThrow(
      CircuitBreakerOpenError,
    );
    expect(operation).not.toHaveBeenCalled();
  });

  it('OPEN 상태에서 openDurationMs가 지나기 전에는 여전히 CircuitBreakerOpenError를 던진다', async () => {
    const breaker = new CircuitBreaker({
      policy: buildPolicy({ minimumRequestCount: 2, openDurationMs: 5_000 }),
      isFailure: isRetryableMessage,
    });
    await failNTimes(breaker, 2);
    expect(breaker.state).toBe('open');

    await vi.advanceTimersByTimeAsync(4_000);

    await expect(
      breaker.execute(() => Promise.resolve('unreachable')),
    ).rejects.toThrow(CircuitBreakerOpenError);
    expect(breaker.state).toBe('open');
  });

  it('OPEN 상태에서 openDurationMs가 지나면 다음 호출에서 HALF_OPEN으로 전이하고 operation을 isTrial=true로 호출한다', async () => {
    const breaker = new CircuitBreaker({
      policy: buildPolicy({ minimumRequestCount: 2, openDurationMs: 5_000 }),
      isFailure: isRetryableMessage,
    });
    await failNTimes(breaker, 2);
    expect(breaker.state).toBe('open');

    await vi.advanceTimersByTimeAsync(5_001);

    const operation = vi.fn((isTrial: boolean) => Promise.resolve(isTrial));
    const result = await breaker.execute(operation);

    expect(operation).toHaveBeenCalledWith(true);
    expect(result).toBe(true);
  });

  it('HALF_OPEN trial이 성공하면 CLOSED로 전이한다', async () => {
    const breaker = new CircuitBreaker({
      policy: buildPolicy({ minimumRequestCount: 2, openDurationMs: 5_000 }),
      isFailure: isRetryableMessage,
    });
    await failNTimes(breaker, 2);
    await vi.advanceTimersByTimeAsync(5_001);

    await breaker.execute(() => Promise.resolve('recovered'));

    expect(breaker.state).toBe('closed');
  });

  it('HALF_OPEN trial이 isFailure로 분류되는 에러로 실패하면 OPEN으로 되돌아간다', async () => {
    const breaker = new CircuitBreaker({
      policy: buildPolicy({ minimumRequestCount: 2, openDurationMs: 5_000 }),
      isFailure: isRetryableMessage,
    });
    await failNTimes(breaker, 2);
    await vi.advanceTimersByTimeAsync(5_001);

    // The open->half-open transition itself is lazy and only happens as
    // part of this triggering call (see the circuit-breaker.ts comment on
    // execute()) — state still reads 'open' until this call runs.
    await expect(
      breaker.execute(() => Promise.reject(new Error('retryable still down'))),
    ).rejects.toThrow('retryable still down');

    expect(breaker.state).toBe('open');
  });

  // Verified against cockatiel's own CircuitBreakerPolicy source
  // (executeHalfOpen's catch block): an error the classifier does NOT count
  // as a circuit failure is treated as "the trial didn't demonstrate
  // continued unavailability" and closes the circuit, rather than leaving it
  // half-open for a future trial. This is cockatiel's documented-in-code
  // behavior, not something this wrapper implements itself.
  it('HALF_OPEN trial이 isFailure로 분류되지 않는 에러로 실패하면 CLOSED로 전이한다 (cockatiel의 half-open 처리 방식)', async () => {
    const breaker = new CircuitBreaker({
      policy: buildPolicy({ minimumRequestCount: 2, openDurationMs: 5_000 }),
      isFailure: isRetryableMessage,
    });
    await failNTimes(breaker, 2);
    await vi.advanceTimersByTimeAsync(5_001);

    await expect(
      breaker.execute(() => Promise.reject(new Error('not our fault'))),
    ).rejects.toThrow('not our fault');

    expect(breaker.state).toBe('closed');
  });

  it('CLOSED 상태에서 isFailure로 분류되지 않는 에러는 실패로 집계되지 않고 원래 에러가 그대로 rethrow된다', async () => {
    const breaker = new CircuitBreaker({
      policy: buildPolicy({ minimumRequestCount: 2 }),
      isFailure: isRetryableMessage,
    });

    await expect(
      breaker.execute(() => Promise.reject(new Error('not our fault'))),
    ).rejects.toThrow('not our fault');
    await expect(
      breaker.execute(() => Promise.reject(new Error('not our fault'))),
    ).rejects.toThrow('not our fault');

    expect(breaker.state).toBe('closed');
  });

  it('isFailure를 넘기지 않으면 기본값으로 classifyInfrastructureRetry를 사용한다', async () => {
    const breaker = new CircuitBreaker({
      policy: buildPolicy({
        minimumRequestCount: 2,
        failureRateThreshold: 0.5,
      }),
    });
    const timeoutError = new InfrastructureException({
      kind: INFRASTRUCTURE_ERROR_KIND.TIMEOUT,
      code: 'test.timeout',
      source: { boundary: 'http-client', adapter: 'test' },
      message: 'timed out',
      details: {},
    });

    for (let i = 0; i < 2; i++) {
      await expect(
        breaker.execute(() => Promise.reject(timeoutError)),
      ).rejects.toBe(timeoutError);
    }

    expect(breaker.state).toBe('open');
  });

  // Verified against cockatiel's source: a second concurrent half-open call
  // does not share the first trial's result. It waits for the trial to
  // settle (so it never piles more load onto the dependency mid-trial), then
  // makes its own independent call against whatever state the trial left
  // behind (a normal closed-state call here, since the trial succeeds).
  it('HALF_OPEN에서 trial 진행 중 동시에 들어온 두 번째 호출은 트라이얼이 끝날 때까지 operation을 다시 호출하지 않고 대기한다', async () => {
    const breaker = new CircuitBreaker({
      policy: buildPolicy({ minimumRequestCount: 2, openDurationMs: 5_000 }),
      isFailure: isRetryableMessage,
    });
    await failNTimes(breaker, 2);
    await vi.advanceTimersByTimeAsync(5_001);

    let resolveTrial!: (value: string) => void;
    const trialPromise = new Promise<string>((resolve) => {
      resolveTrial = resolve;
    });
    const operation = vi.fn(() => trialPromise);

    const firstCall = breaker.execute(operation);
    const secondCall = breaker.execute(operation);

    expect(operation).toHaveBeenCalledTimes(1);
    resolveTrial('recovered');

    await expect(firstCall).resolves.toBe('recovered');
    await expect(secondCall).resolves.toBe('recovered');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(breaker.state).toBe('closed');
  });
});
