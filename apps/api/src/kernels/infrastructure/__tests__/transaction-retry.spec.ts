import { describe, expect, it, vi } from 'vitest';
import { INFRASTRUCTURE_ERROR_KIND } from '../error.base';
import { InfrastructureException } from '../infrastructure.exception';
import {
  withTransactionRetry,
  type TransactionRetryPolicy,
} from '../transaction-retry';

function buildPolicy(
  overrides: Partial<TransactionRetryPolicy> = {},
): TransactionRetryPolicy {
  return { maxRetries: 2, baseDelayMs: 20, ...overrides };
}

function buildConcurrencyConflict(): InfrastructureException {
  return new InfrastructureException({
    kind: INFRASTRUCTURE_ERROR_KIND.CONCURRENCY_CONFLICT,
    code: 'test.concurrency_conflict',
    source: { boundary: 'persistence', adapter: 'test' },
    message: 'concurrency conflict',
    details: {},
  });
}

describe('withTransactionRetry', () => {
  it('첫 시도에 성공하면 operation을 한 번만 호출한다', async () => {
    const operation = vi.fn().mockResolvedValue('ok');

    const result = await withTransactionRetry(operation, {
      policy: buildPolicy(),
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledOnce();
  });

  it('CONCURRENCY_CONFLICT면 재시도해서 결국 성공한다', async () => {
    const error = buildConcurrencyConflict();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('ok');
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await withTransactionRetry(operation, {
      policy: buildPolicy(),
      sleep,
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('classify가 거짓을 반환하는 에러는 sleep 없이 즉시 rethrow한다', async () => {
    const error = new Error('not a concurrency conflict');
    const operation = vi.fn().mockRejectedValue(error);
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      withTransactionRetry(operation, { policy: buildPolicy(), sleep }),
    ).rejects.toBe(error);
    expect(operation).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('maxRetries를 소진하면 마지막 에러를 rethrow한다', async () => {
    const error = buildConcurrencyConflict();
    const operation = vi.fn().mockRejectedValue(error);
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      withTransactionRetry(operation, {
        policy: buildPolicy({ maxRetries: 2 }),
        sleep,
      }),
    ).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('classify를 override하면 그 기준을 따른다', async () => {
    const error = new Error('custom retryable');
    const operation = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('ok');
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await withTransactionRetry(operation, {
      policy: buildPolicy(),
      classify: (caught) => caught === error,
      sleep,
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
