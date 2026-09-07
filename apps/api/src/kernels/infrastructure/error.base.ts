import { type SheskaError } from '@core/sheska-error';

export const INFRASTRUCTURE_ERROR_KIND = {
  // A required infrastructure dependency is not available.
  UNAVAILABLE: 'unavailable',
  // A required infrastructure dependency timed out.
  TIMEOUT: 'timeout',
  // A data constraint was violated (unique/foreign key/not-null/check). Caused
  // by the data itself, not by concurrent execution — never retryable, since
  // retrying with the same data hits the same violation.
  CONFLICT: 'conflict',
  // A database-signalled concurrency conflict (serialization failure,
  // deadlock) — not a data problem, the operation would likely succeed if the
  // whole transaction/unit of work is re-run from the start. Not the same
  // retry mechanism as CONFLICT; see retry-error.classifier.ts for why this
  // kind is deliberately excluded from the generic per-call retry classifier.
  CONCURRENCY_CONFLICT: 'concurrency_conflict',
  // Data returned from or stored in an infrastructure dependency is invalid.
  INVALID_DATA: 'invalid_data',
  // Persisted data could not be restored into the expected model.
  RESTORE_FAILED: 'restore_failed',
  // An http-client boundary call returned a response that cannot be used
  // (non-2xx status, unparseable body). See details.statusCode for retry
  // classification (429/5xx retryable, other 4xx not).
  BAD_RESPONSE: 'bad_response',
  // A persistence-boundary "get" query (one that must return a value) found
  // nothing. Distinct from BAD_RESPONSE: this is a well-formed, valid empty
  // result, not a malformed response. A "find"-style query that may
  // legitimately return nothing should return null instead of using this kind.
  NOT_FOUND: 'not_found',
  // The error cannot be meaningfully classified at the infrastructure boundary.
  UNEXPECTED: 'unexpected',
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
    : Record<string, unknown>;
