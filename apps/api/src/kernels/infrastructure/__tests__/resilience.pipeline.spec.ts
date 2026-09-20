import { describe, expect, it, vi } from 'vitest';
import { UnavailableError } from '@core/errors';
import { computeDeadline } from '@core/deadline';
import { resiliencePipeline } from '../resilience.pipeline';
import { classifyInfrastructureRetry } from '../retry-error.classifier';

const NO_DELAY_RETRY = {
  maxRetries: 1,
  baseDelayMs: 0,
  maxDelayMs: 0,
  classify: classifyInfrastructureRetry,
};

function buildUnavailableError(): UnavailableError {
  return new UnavailableError({
    code: 'test.unavailable',
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
});
