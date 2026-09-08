import { type Deadline } from '@core/deadline';
import { type CircuitBreaker } from './circuit-breaker';
import { withRetry, type RetryAttempt, type RetryPolicy } from './retry';

export interface WithCircuitBreakerRetryOptions {
  readonly breaker: CircuitBreaker;
  readonly deadline: Deadline;
  readonly attemptTimeoutMs: number;
  readonly retryPolicy: RetryPolicy;
  readonly trialPolicy?: RetryPolicy;
}

// A half-open trial must not be retried (circuit-breaker.md: retrying a
// trial defeats its purpose). maxRetries: 0 makes withRetry a single bare
// attempt — baseDelayMs/maxDelayMs are unreachable (backoff is only computed
// after a retryable failure, which never happens when maxRetries is 0).
const NO_RETRY_POLICY: RetryPolicy = {
  maxRetries: 0,
  baseDelayMs: 0,
  maxDelayMs: 0,
};

export function withCircuitBreakerRetry<T>(
  operation: (attempt: RetryAttempt) => Promise<T>,
  options: WithCircuitBreakerRetryOptions,
): Promise<T> {
  const {
    breaker,
    deadline,
    attemptTimeoutMs,
    retryPolicy,
    trialPolicy = NO_RETRY_POLICY,
  } = options;

  return breaker.execute((isTrial) =>
    withRetry(operation, {
      deadline,
      attemptTimeoutMs,
      policy: isTrial ? trialPolicy : retryPolicy,
    }),
  );
}
