import {
  INFRASTRUCTURE_FAILURE_KIND,
  mapPostgresPersistenceFailure,
  POSTGRES_SQLSTATE,
} from '@kernels/infrastructure';
import { describe, expect, it } from 'vitest';

describe('mapPostgresPersistenceFailure', () => {
  it('Postgres conflict details와 원본 vendor error를 보존한다', () => {
    const vendorError = {
      code: POSTGRES_SQLSTATE.UNIQUE_VIOLATION,
      constraint: 'sources_external_source_id_unique',
    };

    const error = mapPostgresPersistenceFailure(vendorError, {
      owner: 'source_postgres_persistence',
      adapter: 'postgres_drizzle',
    });

    expect(error).toMatchObject({
      kind: INFRASTRUCTURE_FAILURE_KIND.CONFLICT,
      code: 'source_postgres_persistence.conflict',
      source: {
        boundary: 'persistence',
        adapter: 'postgres_drizzle',
      },
      message: 'Postgres persistence conflict',
      details: {
        sqlState: POSTGRES_SQLSTATE.UNIQUE_VIOLATION,
        constraint: 'sources_external_source_id_unique',
      },
    });
    expect(error.details.cause).toBe(vendorError);
  });

  it('wrapper cause 안의 Postgres conflict details를 인식하고 원본 wrapper를 보존한다', () => {
    const vendorError = {
      code: POSTGRES_SQLSTATE.UNIQUE_VIOLATION,
      constraint: 'sources_external_source_id_unique',
    };
    const wrappedError = new Error('Failed query', { cause: vendorError });

    const error = mapPostgresPersistenceFailure(wrappedError, {
      owner: 'source_postgres_persistence',
      adapter: 'postgres_drizzle',
    });

    expect(error).toMatchObject({
      kind: INFRASTRUCTURE_FAILURE_KIND.CONFLICT,
      code: 'source_postgres_persistence.conflict',
      details: {
        sqlState: POSTGRES_SQLSTATE.UNIQUE_VIOLATION,
        constraint: 'sources_external_source_id_unique',
      },
    });
    expect(error.details.cause).toBe(wrappedError);
  });

  it('unknown failure를 unavailable로 변환하고 원본 cause를 보존한다', () => {
    const cause = new Error('connection failed');

    const error = mapPostgresPersistenceFailure(cause, {
      owner: 'source_postgres_persistence',
      adapter: 'postgres_drizzle',
    });

    expect(error).toMatchObject({
      kind: INFRASTRUCTURE_FAILURE_KIND.UNAVAILABLE,
      code: 'source_postgres_persistence.unavailable',
      source: {
        boundary: 'persistence',
        adapter: 'postgres_drizzle',
      },
      message: 'Postgres persistence is unavailable',
    });
    expect(error.details.cause).toBe(cause);
  });

  it('지원하지 않는 Postgres code를 conflict로 오인하지 않는다', () => {
    const vendorError = { code: 'toString' };

    const error = mapPostgresPersistenceFailure(vendorError, {
      owner: 'source_postgres_persistence',
      adapter: 'postgres_drizzle',
    });

    expect(error).toMatchObject({
      kind: INFRASTRUCTURE_FAILURE_KIND.UNAVAILABLE,
      code: 'source_postgres_persistence.unavailable',
      message: 'Postgres persistence is unavailable',
    });
    expect(error.details.cause).toBe(vendorError);
  });
});
