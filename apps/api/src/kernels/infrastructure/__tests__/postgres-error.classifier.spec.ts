import { describe, expect, it } from 'vitest';
import { classifyPostgresError } from '../postgres-error.classifier';
import {
  ConcurrencyConflictError,
  ConstraintViolationError,
  TimeoutError,
  UnavailableError,
  UnexpectedError,
} from '@core/errors';

describe('classifyPostgresError', () => {
  it('23505 (unique_violation) → ConstraintViolationError', () => {
    expect(classifyPostgresError(createPostgresError('23505'))).toBe(
      ConstraintViolationError,
    );
  });

  it('23503 (foreign_key_violation)은 코드 결함이므로 → UnexpectedError', () => {
    expect(classifyPostgresError(createPostgresError('23503'))).toBe(
      UnexpectedError,
    );
  });

  it('23502 (not_null_violation)은 코드 결함이므로 → UnexpectedError', () => {
    expect(classifyPostgresError(createPostgresError('23502'))).toBe(
      UnexpectedError,
    );
  });

  it('23514 (check_violation)은 코드 결함이므로 → UnexpectedError', () => {
    expect(classifyPostgresError(createPostgresError('23514'))).toBe(
      UnexpectedError,
    );
  });

  it('40001 (serialization_failure) → ConcurrencyConflictError', () => {
    expect(classifyPostgresError(createPostgresError('40001'))).toBe(
      ConcurrencyConflictError,
    );
  });

  it('40P01 (deadlock_detected) → ConcurrencyConflictError', () => {
    expect(classifyPostgresError(createPostgresError('40P01'))).toBe(
      ConcurrencyConflictError,
    );
  });

  it('08006 (connection_failure) → UnavailableError', () => {
    expect(classifyPostgresError(createPostgresError('08006'))).toBe(
      UnavailableError,
    );
  });

  it('08000 (connection_exception) → UnavailableError', () => {
    expect(classifyPostgresError(createPostgresError('08000'))).toBe(
      UnavailableError,
    );
  });

  it('53300 (too_many_connections) → UnavailableError', () => {
    expect(classifyPostgresError(createPostgresError('53300'))).toBe(
      UnavailableError,
    );
  });

  it.each([
    ['57P01', 'admin_shutdown'],
    ['57P02', 'crash_shutdown'],
    ['57P03', 'cannot_connect_now'],
  ])('%s (%s) → UnavailableError', (code) => {
    expect(classifyPostgresError(createPostgresError(code))).toBe(
      UnavailableError,
    );
  });

  it.each([
    ['53100', 'disk_full'],
    ['53200', 'out_of_memory'],
  ])(
    '%s (%s)는 같은 statement를 다시 받을 수 없으므로 → UnexpectedError',
    (code) => {
      expect(classifyPostgresError(createPostgresError(code))).toBe(
        UnexpectedError,
      );
    },
  );

  it('57014 (query_canceled) → TimeoutError', () => {
    expect(classifyPostgresError(createPostgresError('57014'))).toBe(
      TimeoutError,
    );
  });

  it('알 수 없는 postgres 코드 → UnexpectedError', () => {
    expect(classifyPostgresError(createPostgresError('99999'))).toBe(
      UnexpectedError,
    );
  });

  it('postgres code가 없는 Error → UnexpectedError', () => {
    expect(classifyPostgresError(new Error('connection failed'))).toBe(
      UnexpectedError,
    );
  });

  it('null → UnexpectedError', () => {
    expect(classifyPostgresError(null)).toBe(UnexpectedError);
  });

  it('code 프로퍼티가 없는 객체 → UnexpectedError', () => {
    expect(classifyPostgresError({ message: 'error' })).toBe(UnexpectedError);
  });

  it('code가 string이 아닌 객체 → UnexpectedError', () => {
    expect(classifyPostgresError({ code: 23505 })).toBe(UnexpectedError);
  });

  it('cause에 postgres 코드가 있으면 cause를 기준으로 분류한다 (drizzle wrapping)', () => {
    const pgError = createPostgresError('23505');
    const wrappedError = Object.assign(new Error('drizzle error'), {
      cause: pgError,
    });

    expect(classifyPostgresError(wrappedError)).toBe(ConstraintViolationError);
  });
});

function createPostgresError(code: string): Error {
  return Object.assign(new Error('Postgres error'), { code });
}
