import { applyFullJitter } from '@core/jitter';
import { sleep as defaultSleep } from '@core/sleep';
import { INFRASTRUCTURE_ERROR_KIND } from './error.base';
import { InfrastructureException } from './infrastructure.exception';

export interface TransactionRetryPolicy {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
}

interface WithTransactionRetryOptions {
  readonly policy: TransactionRetryPolicy;
  readonly classify?: (error: unknown) => boolean;
  readonly sleep?: (ms: number) => Promise<void>;
}

function isConcurrencyConflict(error: unknown): boolean {
  return (
    InfrastructureException.is(error) &&
    error.kind === INFRASTRUCTURE_ERROR_KIND.CONCURRENCY_CONFLICT
  );
}

export async function withTransactionRetry<T>(
  operation: () => Promise<T>,
  options: WithTransactionRetryOptions,
): Promise<T> {
  const {
    policy,
    classify = isConcurrencyConflict,
    sleep = defaultSleep,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= policy.maxRetries || !classify(error)) {
        throw error;
      }
      await sleep(applyFullJitter(policy.baseDelayMs));
      attempt += 1;
    }
  }
}
