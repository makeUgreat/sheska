import {
  INFRASTRUCTURE_ERROR_KIND,
  POSTGRES_SQLSTATE,
  PostgresRepositoryBase,
  type PostgresInfrastructureError,
} from '@kernels/infrastructure';
import { describe, expect, it } from 'vitest';

class TestPostgresRepository extends PostgresRepositoryBase<
  'test_postgres_persistence',
  'postgres_drizzle'
> {
  constructor() {
    super('test_postgres_persistence', 'postgres_drizzle');
  }

  run<T>(operation: () => Promise<T>) {
    return this.runPostgres(operation);
  }
}

describe('PostgresRepositoryBase', () => {
  it('successful operation 결과를 반환한다', async () => {
    const repository = new TestPostgresRepository();
    const result = await repository.run(() => Promise.resolve('saved'));

    if (result.isErr()) {
      throw new Error('Expected successful result');
    }

    expect(result.value).toBe('saved');
  });

  it('Postgres state conflict를 infrastructure error로 변환한다', async () => {
    const cause = {
      code: POSTGRES_SQLSTATE.UNIQUE_VIOLATION,
    };
    const error = await rejectWith(cause);

    expect(error).toEqual({
      kind: INFRASTRUCTURE_ERROR_KIND.CONFLICT,
      code: 'test_postgres_persistence.conflict',
      source: {
        boundary: 'persistence',
        adapter: 'postgres_drizzle',
      },
      message: 'Postgres persistence conflict',
      details: {
        sqlState: POSTGRES_SQLSTATE.UNIQUE_VIOLATION,
        cause,
      },
    });
  });

  it('unknown failure를 infrastructure unavailable error로 변환한다', async () => {
    const cause = new Error('connection failed');
    const error = await rejectWith(cause);

    expect(error).toEqual({
      kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
      code: 'test_postgres_persistence.unavailable',
      source: {
        boundary: 'persistence',
        adapter: 'postgres_drizzle',
      },
      message: 'Postgres persistence is unavailable',
      details: {
        cause,
      },
    });
  });
});

async function rejectWith(
  error: unknown,
): Promise<
  PostgresInfrastructureError<'test_postgres_persistence', 'postgres_drizzle'>
> {
  const repository = new TestPostgresRepository();
  const result = await repository.run(async () => {
    await Promise.resolve();
    throw error;
  });

  if (result.isOk()) {
    throw new Error('Expected failed result');
  }

  return result.error;
}
