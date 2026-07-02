import { INFRASTRUCTURE_ERROR_KIND } from '@kernels/infrastructure';
import { classifyPostgresError } from '../postgres-error.classifier';
import { describe, expect, it } from 'vitest';

describe('classifyPostgresError', () => {
  it('23505 (unique_violation) → CONFLICT', () => {
    expect(classifyPostgresError(createPostgresError('23505'))).toBe(
      INFRASTRUCTURE_ERROR_KIND.CONFLICT,
    );
  });

  it('23503 (foreign_key_violation) → CONFLICT', () => {
    expect(classifyPostgresError(createPostgresError('23503'))).toBe(
      INFRASTRUCTURE_ERROR_KIND.CONFLICT,
    );
  });

  it('23502 (not_null_violation) → CONFLICT', () => {
    expect(classifyPostgresError(createPostgresError('23502'))).toBe(
      INFRASTRUCTURE_ERROR_KIND.CONFLICT,
    );
  });

  it('23514 (check_violation) → CONFLICT', () => {
    expect(classifyPostgresError(createPostgresError('23514'))).toBe(
      INFRASTRUCTURE_ERROR_KIND.CONFLICT,
    );
  });

  it('08006 (connection_failure) → UNAVAILABLE', () => {
    expect(classifyPostgresError(createPostgresError('08006'))).toBe(
      INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
    );
  });

  it('08000 (connection_exception) → UNAVAILABLE', () => {
    expect(classifyPostgresError(createPostgresError('08000'))).toBe(
      INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
    );
  });

  it('57014 (query_canceled) → TIMEOUT', () => {
    expect(classifyPostgresError(createPostgresError('57014'))).toBe(
      INFRASTRUCTURE_ERROR_KIND.TIMEOUT,
    );
  });

  it('알 수 없는 postgres 코드 → UNEXPECTED', () => {
    expect(classifyPostgresError(createPostgresError('99999'))).toBe(
      INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
    );
  });

  it('postgres code가 없는 Error → UNEXPECTED', () => {
    expect(classifyPostgresError(new Error('connection failed'))).toBe(
      INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
    );
  });

  it('null → UNEXPECTED', () => {
    expect(classifyPostgresError(null)).toBe(
      INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
    );
  });

  it('code 프로퍼티가 없는 객체 → UNEXPECTED', () => {
    expect(classifyPostgresError({ message: 'error' })).toBe(
      INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
    );
  });

  it('code가 string이 아닌 객체 → UNEXPECTED', () => {
    expect(classifyPostgresError({ code: 23505 })).toBe(
      INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
    );
  });

  it('cause에 postgres 코드가 있으면 cause를 기준으로 분류한다 (drizzle wrapping)', () => {
    const pgError = createPostgresError('23505');
    const wrappedError = Object.assign(new Error('drizzle error'), {
      cause: pgError,
    });

    expect(classifyPostgresError(wrappedError)).toBe(
      INFRASTRUCTURE_ERROR_KIND.CONFLICT,
    );
  });
});

function createPostgresError(code: string): Error {
  return Object.assign(new Error('Postgres error'), { code });
}
