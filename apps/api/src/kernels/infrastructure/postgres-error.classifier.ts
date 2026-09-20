import {
  ConcurrencyConflictError,
  ConstraintViolationError,
  TimeoutError,
  UnavailableError,
  UnexpectedError,
} from '@core/errors';

export type PostgresErrorClass =
  | typeof UnavailableError
  | typeof TimeoutError
  | typeof ConstraintViolationError
  | typeof ConcurrencyConflictError
  | typeof UnexpectedError;

// PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const POSTGRES_ERROR_CLASS_MAP: Record<string, PostgresErrorClass> = {
  // Class 08 — Connection Exception
  '08000': UnavailableError,
  '08001': UnavailableError,
  '08003': UnavailableError,
  '08004': UnavailableError,
  '08006': UnavailableError,
  // Class 53 — Insufficient Resources.
  // Only connection exhaustion is transient. disk_full and out_of_memory leave
  // the server unable to serve the same statement a second time, so they stay
  // UNEXPECTED (500) instead of promising the caller a later retry.
  '53300': UnavailableError, // too_many_connections
  // Class 57 — Operator Intervention.
  // A server that is shutting down, restarting or still starting up refuses
  // this connection but not the next one.
  '57P01': UnavailableError, // admin_shutdown
  '57P02': UnavailableError, // crash_shutdown
  '57P03': UnavailableError, // cannot_connect_now
  '57014': TimeoutError, // query_canceled (statement timeout)
  // Class 23 — Integrity Constraint Violation.
  // Only uniqueness is an expected outcome the caller can act on. The rest mean
  // the code passed data the schema forbids, so they stay UnexpectedError (500).
  '23505': ConstraintViolationError, // unique_violation
  // Class 40 — Transaction Rollback (concurrency, not data)
  '40001': ConcurrencyConflictError, // serialization_failure
  '40P01': ConcurrencyConflictError, // deadlock_detected
};

export function classifyPostgresError(error: unknown): PostgresErrorClass {
  const errorClass = classifyByCode(error);
  if (errorClass !== UnexpectedError) {
    return errorClass;
  }

  if (error !== null && typeof error === 'object' && 'cause' in error) {
    return classifyByCode(error.cause);
  }

  return UnexpectedError;
}

function classifyByCode(error: unknown): PostgresErrorClass {
  if (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    const mapped = POSTGRES_ERROR_CLASS_MAP[error.code];
    if (mapped !== undefined) {
      return mapped;
    }
  }
  return UnexpectedError;
}
