import {
  INFRASTRUCTURE_ERROR_KIND,
  type InfrastructureErrorKind,
} from './error.base';

// PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const POSTGRES_ERROR_KIND_MAP: Record<string, InfrastructureErrorKind> = {
  // Class 08 — Connection Exception
  '08000': INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
  '08001': INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
  '08003': INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
  '08004': INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
  '08006': INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
  // Class 57 — Operator Intervention (statement timeout)
  '57014': INFRASTRUCTURE_ERROR_KIND.TIMEOUT,
  // Class 23 — Integrity Constraint Violation
  '23505': INFRASTRUCTURE_ERROR_KIND.CONFLICT, // unique_violation
  '23503': INFRASTRUCTURE_ERROR_KIND.CONFLICT, // foreign_key_violation
  '23502': INFRASTRUCTURE_ERROR_KIND.CONFLICT, // not_null_violation
  '23514': INFRASTRUCTURE_ERROR_KIND.CONFLICT, // check_violation
};

export function classifyPostgresError(error: unknown): InfrastructureErrorKind {
  const kind = classifyByCode(error);
  if (kind !== INFRASTRUCTURE_ERROR_KIND.UNEXPECTED) {
    return kind;
  }

  if (error !== null && typeof error === 'object' && 'cause' in error) {
    return classifyByCode(error.cause);
  }

  return INFRASTRUCTURE_ERROR_KIND.UNEXPECTED;
}

function classifyByCode(error: unknown): InfrastructureErrorKind {
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
