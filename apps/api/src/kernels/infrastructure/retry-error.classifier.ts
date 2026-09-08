import {
  INFRASTRUCTURE_ERROR_KIND,
  type InfrastructureBadResponseDetails,
  type InfrastructureErrorKind,
} from './error.base';
import { InfrastructureException } from './infrastructure.exception';

export interface RetryClassification {
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
}

// TimeoutError/NetworkError equivalents per retry.md's Network-Level Classification.
const RETRYABLE_INFRASTRUCTURE_ERROR_KINDS: ReadonlySet<InfrastructureErrorKind> =
  new Set([
    INFRASTRUCTURE_ERROR_KIND.TIMEOUT,
    INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
  ]);

function isRetryableStatusCode(statusCode: number): boolean {
  return statusCode === 429 || (statusCode >= 500 && statusCode <= 599);
}

export function classifyInfrastructureRetry(
  error: unknown,
): RetryClassification {
  if (!InfrastructureException.is(error)) {
    return { retryable: false };
  }

  if (error.kind === INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE) {
    const { statusCode, retryAfterMs } =
      error.details as InfrastructureBadResponseDetails;
    return isRetryableStatusCode(statusCode)
      ? { retryable: true, retryAfterMs }
      : { retryable: false };
  }

  return { retryable: RETRYABLE_INFRASTRUCTURE_ERROR_KINDS.has(error.kind) };
}
