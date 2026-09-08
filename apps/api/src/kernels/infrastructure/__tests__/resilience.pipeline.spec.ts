import { describe, expect, it, vi } from 'vitest';
import { computeDeadline } from '@core/deadline';
import { CircuitBreaker } from '../circuit-breaker';
import { INFRASTRUCTURE_ERROR_KIND } from '../error.base';
import { InfrastructureException } from '../infrastructure.exception';
import { resiliencePipeline } from '../resilience.pipeline';
import { classifyInfrastructureRetry } from '../retry-error.classifier';

const NO_DELAY_RETRY = {
  maxRetries: 1,
  baseDelayMs: 0,
  maxDelayMs: 0,
  classify: classifyInfrastructureRetry,
};

function buildUnavailableError(): InfrastructureException {
  return new InfrastructureException({
    kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
    code: 'test.unavailable',
    source: { boundary: 'http-client', adapter: 'test' },
    message: 'unavailable',
    details: {},
  });
}

describe('resiliencePipeline', () => {
  it('retry의 각 attempt에 timeout signal을 새로 만든다', async () => {
    const signals: AbortSignal[] = [];
    const operation = vi.fn(({ signal }: { signal: AbortSignal }) => {
      signals.push(signal);
      return signals.length === 1
        ? Promise.reject(buildUnavailableError())
        : Promise.resolve('ok');
    });
    const pipeline = resiliencePipeline()
      .retry(NO_DELAY_RETRY)
      .timeout({
        deadline: computeDeadline(60_000),
        attemptTimeoutMs: 1_000,
      });

    const result = await pipeline.execute(operation);

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(signals[0]).not.toBe(signals[1]);
  });

  it('circuit breaker가 open이면 내부 operation을 실행하지 않는다', async () => {
    const breaker = new CircuitBreaker({
      policy: {
        failureRateThreshold: 0.5,
        evaluationWindowMs: 10_000,
        minimumRequestCount: 1,
        openDurationMs: 60_000,
      },
    });
    const pipeline = resiliencePipeline()
      .circuitBreaker(breaker)
      .timeout({
        deadline: computeDeadline(60_000),
        attemptTimeoutMs: 1_000,
      });

    await expect(
      pipeline.execute(() => Promise.reject(buildUnavailableError())),
    ).rejects.toThrow();

    const operation = vi.fn().mockResolvedValue('unreachable');
    await expect(pipeline.execute(operation)).rejects.toThrow(
      'circuit breaker is open',
    );
    expect(operation).not.toHaveBeenCalled();
  });

  it('circuit breaker의 half-open trial에서는 retry하지 않는다', async () => {
    const breaker = new CircuitBreaker({
      policy: {
        failureRateThreshold: 0.5,
        evaluationWindowMs: 10_000,
        minimumRequestCount: 1,
        openDurationMs: 10,
      },
    });
    const options = {
      deadline: computeDeadline(60_000),
      attemptTimeoutMs: 1_000,
    };

    await expect(
      resiliencePipeline()
        .circuitBreaker(breaker)
        .timeout(options)
        .execute(() => Promise.reject(buildUnavailableError())),
    ).rejects.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 15));

    const trialOperation = vi.fn(() => Promise.reject(buildUnavailableError()));
    await expect(
      resiliencePipeline()
        .circuitBreaker(breaker)
        .retry({ ...NO_DELAY_RETRY, maxRetries: 5 })
        .timeout(options)
        .execute(trialOperation),
    ).rejects.toThrow();

    expect(trialOperation).toHaveBeenCalledOnce();
  });
});
