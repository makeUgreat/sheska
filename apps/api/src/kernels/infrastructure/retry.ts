import { computeExponentialBackoffMs } from '@core/backoff';
import { effectiveTimeoutMs, remainingMs, type Deadline } from '@core/deadline';
import { applyFullJitter } from '@core/jitter';
import {
  classifyInfrastructureRetry,
  type RetryClassification,
} from './retry-error.classifier';

export interface RetryPolicy {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

interface RetryAttempt {
  readonly attempt: number;
  readonly signal: AbortSignal;
}

interface WithRetryOptions {
  readonly deadline: Deadline;
  readonly attemptTimeoutMs: number;
  readonly policy: RetryPolicy;
  readonly classify?: (error: unknown) => RetryClassification;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly random?: () => number;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: (attempt: RetryAttempt) => Promise<T>,
  options: WithRetryOptions,
): Promise<T> {
  const {
    deadline,
    attemptTimeoutMs,
    policy,
    classify = classifyInfrastructureRetry,
    now = Date.now,
    sleep = defaultSleep,
    random = Math.random,
  } = options;

  let attempt = 0;

  for (;;) {
    const signal = AbortSignal.timeout(
      effectiveTimeoutMs(deadline, attemptTimeoutMs, now()),
    );

    try {
      return await operation({ attempt, signal });
    } catch (error) {
      if (attempt >= policy.maxRetries) {
        throw error;
      }

      const classification = classify(error);
      if (!classification.retryable) {
        throw error;
      }

      const delay =
        classification.retryAfterMs ??
        applyFullJitter(
          computeExponentialBackoffMs(
            attempt,
            policy.baseDelayMs,
            policy.maxDelayMs,
          ),
          random,
        );

      if (delay >= remainingMs(deadline, now())) {
        throw error;
      }

      await sleep(delay);
      attempt += 1;
    }
  }
}
