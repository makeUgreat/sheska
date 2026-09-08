import { describe, expect, it, vi } from 'vitest';
import { computeDeadline } from '@core/deadline';
import { CircuitBreaker, type CircuitBreakerPolicy } from '../circuit-breaker';
import {
  withCircuitBreakerRetry,
  type WithCircuitBreakerRetryOptions,
} from '../circuit-breaker-retry';
import { INFRASTRUCTURE_ERROR_KIND } from '../error.base';
import { InfrastructureException } from '../infrastructure.exception';
import { type RetryPolicy } from '../retry';

// Small real millisecond values throughout (no fake timers): withRetry's
// backoff sleep uses a real setTimeout internally, which vi.useFakeTimers()
// would also intercept and require manually advancing — real, tiny delays
// are simpler and avoid that interaction entirely.
function buildBreakerPolicy(
  overrides: Partial<CircuitBreakerPolicy> = {},
): CircuitBreakerPolicy {
  return {
    failureRateThreshold: 0.5,
    evaluationWindowMs: 10_000,
    minimumRequestCount: 1,
    openDurationMs: 10,
    ...overrides,
  };
}

const ZERO_DELAY_RETRY: RetryPolicy = {
  maxRetries: 1,
  baseDelayMs: 0,
  maxDelayMs: 0,
};

// classifyInfrastructureRetry (the default used by both withRetry inside
// this helper and CircuitBreaker's own default isFailure) treats UNAVAILABLE
// as retryable/a failure — matches how the real adapter uses this helper
// with no classify/isFailure overrides.
function buildUnavailableError(): InfrastructureException {
  return new InfrastructureException({
    kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
    code: 'test.unavailable',
    source: { boundary: 'http-client', adapter: 'test' },
    message: 'unavailable',
    details: {},
  });
}

function buildOptions(
  breaker: CircuitBreaker,
  overrides: Partial<WithCircuitBreakerRetryOptions> = {},
): WithCircuitBreakerRetryOptions {
  return {
    breaker,
    deadline: computeDeadline(60_000),
    attemptTimeoutMs: 1_000,
    retryPolicy: ZERO_DELAY_RETRY,
    ...overrides,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('withCircuitBreakerRetry', () => {
  it('CLOSED 상태(정상 호출)에서는 retryPolicy로 재시도한다', async () => {
    const breaker = new CircuitBreaker({ policy: buildBreakerPolicy() });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(buildUnavailableError())
      .mockResolvedValue('ok');

    const result = await withCircuitBreakerRetry(
      operation,
      buildOptions(breaker),
    );

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('HALF_OPEN trial에서는 retryPolicy를 무시하고 재시도 없이 단발로 호출한다', async () => {
    const breaker = new CircuitBreaker({ policy: buildBreakerPolicy() });

    await expect(
      withCircuitBreakerRetry(
        () => Promise.reject(buildUnavailableError()),
        buildOptions(breaker, {
          retryPolicy: { maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0 },
        }),
      ),
    ).rejects.toThrow();
    expect(breaker.state).toBe('open');

    await sleep(15);

    const trialOperation = vi.fn(() => Promise.reject(buildUnavailableError()));
    await expect(
      withCircuitBreakerRetry(
        trialOperation,
        buildOptions(breaker, {
          // A retryPolicy that would clearly retry if it were honored —
          // proves the trial branch bypasses it rather than just happening
          // to have maxRetries: 0 too.
          retryPolicy: { maxRetries: 5, baseDelayMs: 0, maxDelayMs: 0 },
        }),
      ),
    ).rejects.toThrow();

    expect(trialOperation).toHaveBeenCalledOnce();
  });

  it('trialPolicy를 명시적으로 넘기면 half-open trial에 그 policy를 쓴다', async () => {
    const breaker = new CircuitBreaker({ policy: buildBreakerPolicy() });
    const customTrialPolicy: RetryPolicy = {
      maxRetries: 1,
      baseDelayMs: 0,
      maxDelayMs: 0,
    };

    await expect(
      withCircuitBreakerRetry(
        () => Promise.reject(buildUnavailableError()),
        buildOptions(breaker, {
          retryPolicy: { maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0 },
        }),
      ),
    ).rejects.toThrow();
    await sleep(15);

    const trialOperation = vi
      .fn()
      .mockRejectedValueOnce(buildUnavailableError())
      .mockResolvedValue('recovered');

    const result = await withCircuitBreakerRetry(
      trialOperation,
      buildOptions(breaker, { trialPolicy: customTrialPolicy }),
    );

    expect(result).toBe('recovered');
    expect(trialOperation).toHaveBeenCalledTimes(2);
  });

  it('breaker가 OPEN이면 operation을 호출하지 않고 CircuitBreakerOpenError를 던진다', async () => {
    const breaker = new CircuitBreaker({ policy: buildBreakerPolicy() });
    await expect(
      withCircuitBreakerRetry(
        () => Promise.reject(buildUnavailableError()),
        buildOptions(breaker, {
          retryPolicy: { maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0 },
        }),
      ),
    ).rejects.toThrow();
    expect(breaker.state).toBe('open');

    const operation = vi.fn(() => Promise.resolve('unreachable'));
    await expect(
      withCircuitBreakerRetry(operation, buildOptions(breaker)),
    ).rejects.toThrow('circuit breaker is open');
    expect(operation).not.toHaveBeenCalled();
  });
});
