export const ERROR_KIND = {
  INVARIANT_VIOLATION: 'invariant_violation',
  VALIDATION_FAILED: 'validation_failed',
  NOT_FOUND: 'not_found',
  STATE_CONFLICT: 'state_conflict',
  CONSTRAINT_VIOLATION: 'constraint_violation',
  CONCURRENCY_CONFLICT: 'concurrency_conflict',
  UNAVAILABLE: 'unavailable',
  TIMEOUT: 'timeout',
  INVALID_DATA: 'invalid_data',
  BAD_RESPONSE: 'bad_response',
  UNEXPECTED: 'unexpected',
} as const;

export type ErrorKind = (typeof ERROR_KIND)[keyof typeof ERROR_KIND];

export interface SheskaErrorParams<Details> {
  readonly code: string;
  readonly message: string;
  readonly details: Details;
  readonly cause?: unknown;
}

export abstract class SheskaError<Details = unknown> extends Error {
  abstract readonly kind: ErrorKind;
  readonly code: string;
  readonly details: Details;

  constructor(params: SheskaErrorParams<Details>) {
    super(params.message, { cause: params.cause });
    this.name = new.target.name;
    this.code = params.code;
    this.details = params.details;
  }
}

export type InvariantViolationDetails = {
  readonly fields: string[];
};

export class InvariantViolationError extends SheskaError<InvariantViolationDetails> {
  readonly kind = ERROR_KIND.INVARIANT_VIOLATION;
}

export type ValidationFieldDetail = {
  readonly path: string;
  readonly messages: string[];
};

export type ValidationFailedDetails = {
  readonly fields: ValidationFieldDetail[];
};

export class ValidationFailedError extends SheskaError<ValidationFailedDetails> {
  readonly kind = ERROR_KIND.VALIDATION_FAILED;
}

export class NotFoundError extends SheskaError<Record<string, unknown>> {
  readonly kind = ERROR_KIND.NOT_FOUND;
}

export class StateConflictError extends SheskaError<Record<string, unknown>> {
  readonly kind = ERROR_KIND.STATE_CONFLICT;
}

// 유일성 위반. 호출자가 원하는 행이 이미 있다는 뜻이라 동시성 아래에서 기대되는 결과이고, 그 의미는
// 경계가 아니라 호출자가 정한다. 같은 데이터는 같은 위반을 내므로 재시도해도 소용없다. 나머지 제약
// 위반(foreign key, not-null, check)은 코드가 잘못된 데이터를 넘긴 것이라 UnexpectedError로 분류한다.
export class ConstraintViolationError extends SheskaError<
  Record<string, unknown>
> {
  readonly kind = ERROR_KIND.CONSTRAINT_VIOLATION;
}

// 데이터베이스가 알린 동시성 충돌(serialization failure, deadlock). 데이터 문제가 아니라 작업 단위를
// 처음부터 다시 실행하면 대개 성공한다. 호출 단위 재시도로는 풀리지 않아 retry-error.classifier.ts의
// 재시도 대상에서 일부러 빠져 있다.
export class ConcurrencyConflictError extends SheskaError<
  Record<string, unknown>
> {
  readonly kind = ERROR_KIND.CONCURRENCY_CONFLICT;
}

export class UnavailableError extends SheskaError<Record<string, unknown>> {
  readonly kind = ERROR_KIND.UNAVAILABLE;
}

export class TimeoutError extends SheskaError<Record<string, unknown>> {
  readonly kind = ERROR_KIND.TIMEOUT;
}

export type InvalidDataDetails = {
  readonly fields: string[];
};

export class InvalidDataError extends SheskaError<InvalidDataDetails> {
  readonly kind = ERROR_KIND.INVALID_DATA;
}

export type BadResponseDetails = {
  readonly statusCode: number;
  readonly retryAfterMs?: number;
};

export class BadResponseError extends SheskaError<BadResponseDetails> {
  readonly kind = ERROR_KIND.BAD_RESPONSE;
}

export class UnexpectedError extends SheskaError<Record<string, unknown>> {
  readonly kind = ERROR_KIND.UNEXPECTED;
}
