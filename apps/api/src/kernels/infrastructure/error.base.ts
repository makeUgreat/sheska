import { ERROR_KIND } from '@core/error-kind';
import { type SheskaError } from '@core/sheska-error';

export const INFRASTRUCTURE_ERROR_KIND = {
  // A required infrastructure dependency is not available.
  UNAVAILABLE: ERROR_KIND.UNAVAILABLE,
  // A required infrastructure dependency timed out.
  TIMEOUT: ERROR_KIND.TIMEOUT,
  // A uniqueness constraint was violated: the row the caller wants already
  // exists. Expected under concurrency, so the caller — not this boundary —
  // decides what it means. Never retryable: the same data hits the same
  // violation. Other constraint violations (foreign key, not-null, check) mean
  // the code passed bad data and are classified UNEXPECTED instead.
  CONSTRAINT_VIOLATION: ERROR_KIND.CONSTRAINT_VIOLATION,
  // A database-signalled concurrency conflict (serialization failure,
  // deadlock) — not a data problem, the operation would likely succeed if the
  // whole transaction/unit of work is re-run from the start. Not the same
  // retry mechanism as CONSTRAINT_VIOLATION; see retry-error.classifier.ts for why this
  // kind is deliberately excluded from the generic per-call retry classifier.
  CONCURRENCY_CONFLICT: ERROR_KIND.CONCURRENCY_CONFLICT,
  // Data returned from or stored in an infrastructure dependency is invalid.
  INVALID_DATA: ERROR_KIND.INVALID_DATA,
  // Persisted data could not be restored into the expected model.
  RESTORE_FAILED: ERROR_KIND.RESTORE_FAILED,
  // An http-client boundary call returned a response that cannot be used
  // (non-2xx status, unparseable body). See details.statusCode for retry
  // classification (429/5xx retryable, other 4xx not).
  BAD_RESPONSE: ERROR_KIND.BAD_RESPONSE,
  // A persistence-boundary "get" query (one that must return a value) found
  // nothing. Distinct from BAD_RESPONSE: this is a well-formed, valid empty
  // result, not a malformed response. A "find"-style query that may
  // legitimately return nothing should return null instead of using this kind.
  NOT_FOUND: ERROR_KIND.NOT_FOUND,
  // The error cannot be meaningfully classified at the infrastructure boundary.
  UNEXPECTED: ERROR_KIND.UNEXPECTED,
} as const;

export type InfrastructureErrorKind =
  (typeof INFRASTRUCTURE_ERROR_KIND)[keyof typeof INFRASTRUCTURE_ERROR_KIND];

export type InfrastructureErrorCode<
  Owner extends string,
  Reason extends string,
> = `${Owner}.${Reason}`;

export interface InfrastructureErrorSource {
  readonly boundary: 'persistence' | 'message-broker' | 'http-client';
  readonly adapter: string;
}

export interface InfrastructureErrorBase<
  Kind extends InfrastructureErrorKind = InfrastructureErrorKind,
  Code extends string = string,
  Details extends Record<string, unknown> = InfrastructureErrorDetailsFor<Kind>,
  Source extends InfrastructureErrorSource = InfrastructureErrorSource,
> extends SheskaError {
  readonly kind: Kind;
  readonly code: Code;
  readonly source: Source;
  readonly message: string;
  readonly details: Details;
  readonly cause?: unknown;
}

export type InfrastructureErrorOf<
  Kind extends InfrastructureErrorKind,
  Owner extends string,
  Reason extends string,
  Details extends Record<string, unknown> = InfrastructureErrorDetailsFor<Kind>,
  Source extends InfrastructureErrorSource = InfrastructureErrorSource,
> = InfrastructureErrorBase<
  Kind,
  InfrastructureErrorCode<Owner, Reason>,
  Details,
  Source
>;

export type InfrastructureInvalidDataDetails = {
  readonly fields: string[];
};

export type InfrastructureTimeoutDetails = {
  readonly deadlineBound: boolean;
};

export type InfrastructureBadResponseDetails = {
  readonly statusCode: number;
  readonly retryAfterMs?: number;
};

export type InfrastructureErrorDetailsFor<
  Kind extends InfrastructureErrorKind,
> = Kind extends typeof INFRASTRUCTURE_ERROR_KIND.INVALID_DATA
  ? InfrastructureInvalidDataDetails
  : Kind extends typeof INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE
    ? InfrastructureBadResponseDetails
    : Kind extends typeof INFRASTRUCTURE_ERROR_KIND.TIMEOUT
      ? InfrastructureTimeoutDetails
      : Record<string, unknown>;

export type InfrastructureError =
  | InfrastructureErrorOf<
      typeof INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE,
      string,
      string,
      InfrastructureBadResponseDetails
    >
  | InfrastructureErrorOf<
      Exclude<
        InfrastructureErrorKind,
        typeof INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE
      >,
      string,
      string,
      Record<string, unknown>
    >;
