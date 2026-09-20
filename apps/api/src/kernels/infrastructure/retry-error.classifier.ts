import { BadResponseError, TimeoutError, UnavailableError } from '@core/errors';

export interface RetryClassification {
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
}

function isRetryableStatusCode(statusCode: number): boolean {
  return statusCode === 429 || (statusCode >= 500 && statusCode <= 599);
}

export function classifyInfrastructureRetry(
  error: unknown,
): RetryClassification {
  if (error instanceof BadResponseError) {
    const { statusCode, retryAfterMs } = error.details;
    return isRetryableStatusCode(statusCode)
      ? { retryable: true, retryAfterMs }
      : { retryable: false };
  }

  // TimeoutError/UnavailableError are the network-level retryables per retry.md.
  return {
    retryable:
      error instanceof TimeoutError || error instanceof UnavailableError,
  };
}
