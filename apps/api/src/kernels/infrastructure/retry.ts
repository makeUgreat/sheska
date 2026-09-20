import { computeRetryDelayMs } from '@core/backoff';
import { remainingMs, type Deadline } from '@core/deadline';
import { sleep as defaultSleep } from '@core/sleep';
import { type RetryClassification } from './retry-error.classifier';

export interface RetryPolicy {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly classify: (error: unknown) => RetryClassification;
}

interface RetryLoopOptions {
  readonly deadline: Deadline;
  readonly policy: RetryPolicy;
}

export interface RetryRuntime {
  readonly now: () => number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly random: () => number;
}

export const SYSTEM_RETRY_RUNTIME: RetryRuntime = {
  now: Date.now,
  sleep: defaultSleep,
  random: Math.random,
};

export async function withRetryAttempts<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryLoopOptions,
  runtime: RetryRuntime,
): Promise<T> {
  const { deadline, policy } = options;
  const { now, sleep, random } = runtime;

  let attempt = 0;

  while (true) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= policy.maxRetries) {
        throw error;
      }

      const classification = policy.classify(error);
      if (!classification.retryable) {
        throw error;
      }

      const delay =
        classification.retryAfterMs ??
        computeRetryDelayMs(attempt, policy, random);

      if (delay >= remainingMs(deadline, now())) {
        throw error;
      }

      await sleep(delay);
      attempt += 1;
    }
  }
}
