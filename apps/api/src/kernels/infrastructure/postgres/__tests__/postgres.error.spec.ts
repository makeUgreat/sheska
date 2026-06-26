import {
  INFRASTRUCTURE_ERROR_KIND,
  mapPostgresPersistenceError,
  POSTGRES_SQLSTATE,
} from '@kernels/infrastructure';
import { describe, expect, it } from 'vitest';

describe('mapPostgresPersistenceError', () => {
  it('Postgres conflict details와 원본 vendor error를 보존한다', () => {
    const vendorError = {
      code: POSTGRES_SQLSTATE.UNIQUE_VIOLATION,
      constraint: 'sources_external_source_id_unique',
    };

    const error = mapPostgresPersistenceError(vendorError, {
      owner: 'source_postgres_persistence',
      adapter: 'postgres_drizzle',
    });

    expect(error).toMatchObject({
      kind: INFRASTRUCTURE_ERROR_KIND.CONFLICT,
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

  it('unknown failure를 unavailable로 변환하고 원본 cause를 보존한다', () => {
    const cause = new Error('connection failed');

    const error = mapPostgresPersistenceError(cause, {
      owner: 'source_postgres_persistence',
      adapter: 'postgres_drizzle',
    });

    expect(error).toMatchObject({
      kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
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

    const error = mapPostgresPersistenceError(vendorError, {
      owner: 'source_postgres_persistence',
      adapter: 'postgres_drizzle',
    });

    expect(error).toMatchObject({
      kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
      code: 'source_postgres_persistence.unavailable',
      message: 'Postgres persistence is unavailable',
    });
    expect(error.details.cause).toBe(vendorError);
  });
});
