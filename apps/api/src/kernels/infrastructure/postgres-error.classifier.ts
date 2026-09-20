import { INFRASTRUCTURE_ERROR_KIND } from './error.base';

export type PostgresErrorKind =
  | typeof INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE
  | typeof INFRASTRUCTURE_ERROR_KIND.TIMEOUT
  | typeof INFRASTRUCTURE_ERROR_KIND.CONSTRAINT_VIOLATION
  | typeof INFRASTRUCTURE_ERROR_KIND.CONCURRENCY_CONFLICT
  | typeof INFRASTRUCTURE_ERROR_KIND.UNEXPECTED;

// PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const POSTGRES_ERROR_KIND_MAP: Record<string, PostgresErrorKind> = {
  // Class 08 — Connection Exception
  '08000': INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
  '08001': INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
  '08003': INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
  '08004': INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
  '08006': INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
  // Class 57 — Operator Intervention (statement timeout)
  '57014': INFRASTRUCTURE_ERROR_KIND.TIMEOUT,
  // Class 23 — Integrity Constraint Violation.
  // Only uniqueness is an expected outcome the caller can act on. The rest mean
  // the code passed data the schema forbids, so they stay UNEXPECTED (500).
  '23505': INFRASTRUCTURE_ERROR_KIND.CONSTRAINT_VIOLATION, // unique_violation
  // Class 40 — Transaction Rollback (concurrency, not data)
  '40001': INFRASTRUCTURE_ERROR_KIND.CONCURRENCY_CONFLICT, // serialization_failure
  '40P01': INFRASTRUCTURE_ERROR_KIND.CONCURRENCY_CONFLICT, // deadlock_detected
};

export function classifyPostgresError(error: unknown): PostgresErrorKind {
  const kind = classifyByCode(error);
  if (kind !== INFRASTRUCTURE_ERROR_KIND.UNEXPECTED) {
    return kind;
  }

  if (error !== null && typeof error === 'object' && 'cause' in error) {
    return classifyByCode(error.cause);
  }

  return INFRASTRUCTURE_ERROR_KIND.UNEXPECTED;
}

function classifyByCode(error: unknown): PostgresErrorKind {
  if (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    const mapped = POSTGRES_ERROR_KIND_MAP[error.code];
    if (mapped !== undefined) {
      return mapped;
    }
  }
  return INFRASTRUCTURE_ERROR_KIND.UNEXPECTED;
}
