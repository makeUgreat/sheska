import {
  INFRASTRUCTURE_FAILURE_KIND,
  type InfrastructureFailureCauseDetails,
  type InfrastructureFailureOf,
  type InfrastructureInvalidDataDetails,
} from '@kernels/infrastructure';
import { describe, expect, it } from 'vitest';

describe('InfrastructureFailure', () => {
  it('infrastructure error kind 상수를 제공한다', () => {
    expect(INFRASTRUCTURE_FAILURE_KIND).toEqual({
      UNAVAILABLE: 'unavailable',
      TIMEOUT: 'timeout',
      CONFLICT: 'conflict',
      INVALID_DATA: 'invalid_data',
      RESTORE_FAILED: 'restore_failed',
      BAD_RESPONSE: 'bad_response',
      UNEXPECTED: 'unexpected',
    });
  });

  it('infrastructure error source로 boundary와 adapter를 표현한다', () => {
    const error: InfrastructureFailureOf<
      typeof INFRASTRUCTURE_FAILURE_KIND.UNAVAILABLE,
      'source_postgres_persistence',
      'unavailable',
      InfrastructureFailureCauseDetails,
      { readonly boundary: 'persistence'; readonly adapter: 'postgres_drizzle' }
    > = {
      kind: INFRASTRUCTURE_FAILURE_KIND.UNAVAILABLE,
      code: 'source_postgres_persistence.unavailable',
      source: {
        boundary: 'persistence',
        adapter: 'postgres_drizzle',
      },
      message: 'Source Postgres persistence is unavailable',
      details: {
        cause: new Error('connection failed'),
      },
    };

    expect(error.source).toEqual({
      boundary: 'persistence',
      adapter: 'postgres_drizzle',
    });
  });

  it('invalid_data error details는 field 목록으로 표현한다', () => {
    const details: InfrastructureInvalidDataDetails = {
      fields: ['contentSnapshot.size'],
      cause: { code: 'source.size_mismatch' },
    };
    const error: InfrastructureFailureOf<
      typeof INFRASTRUCTURE_FAILURE_KIND.INVALID_DATA,
      'source_postgres_persistence',
      'row_invalid'
    > = {
      kind: INFRASTRUCTURE_FAILURE_KIND.INVALID_DATA,
      code: 'source_postgres_persistence.row_invalid',
      source: {
        boundary: 'persistence',
        adapter: 'postgres_drizzle',
      },
      message: 'Source Postgres persistence row is invalid',
      details,
    };

    expect(error.details.fields).toEqual(['contentSnapshot.size']);
  });
});
