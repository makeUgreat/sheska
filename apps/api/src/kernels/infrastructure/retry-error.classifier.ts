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

  if (RETRYABLE_INFRASTRUCTURE_ERROR_KINDS.has(error.kind)) {
    return { retryable: true };
  }

  if (error.kind === INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE) {
    const { statusCode, retryAfterMs } =
      error.details as InfrastructureBadResponseDetails;
    return isRetryableStatusCode(statusCode)
      ? { retryable: true, retryAfterMs }
      : { retryable: false };
  }

  // CONCURRENCY_CONFLICT is intentionally NOT in the retryable set above: per
  // retry.md's DB Transaction Conflict Classification, this kind is only safe
  // to retry by re-running the whole transaction/unit of work from the start,
  // not by re-attempting a single call the way withRetry does. Wiring that up
  // needs a transaction-level retry mechanism, not this generic classifier.
  return { retryable: false };
}
