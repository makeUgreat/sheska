import { describe, expect, it, vi } from 'vitest';
import { buildSourceEmbedding } from '../../../../../../../test/support/domains/fixtures/source-embedding.fixture';
import { SourceEmbeddingPgDrizzleRepository } from '../source-embedding.pg-drizzle.repository';
import {
  ConcurrencyConflictError,
  ConstraintViolationError,
  UnexpectedError,
} from '@core/errors';

describe('SourceEmbeddingPgDrizzleRepository', () => {
  it('Postgres error는 ConstraintViolationError로 전파하고 재시도하지 않는다', async () => {
    const { db, transaction } = createSaveRejectingDb(
      createPostgresError('23505'),
    );
    const repository = new SourceEmbeddingPgDrizzleRepository(db);

    const result = repository.upsert(buildSourceEmbedding());

    await expect(result).rejects.toBeInstanceOf(ConstraintViolationError);
    await expect(result).rejects.toMatchObject({
      code: 'source_embedding.upsert_failed',
    });
    expect(transaction).toHaveBeenCalledOnce();
  });

  it('unknown failure는 UnexpectedError로 전파하고 재시도하지 않는다', async () => {
    const { db, transaction } = createSaveRejectingDb(
      new Error('connection failed'),
    );
    const repository = new SourceEmbeddingPgDrizzleRepository(db);

    const result = repository.upsert(buildSourceEmbedding());

    await expect(result).rejects.toBeInstanceOf(UnexpectedError);
    await expect(result).rejects.toMatchObject({
      code: 'source_embedding.upsert_failed',
    });
    expect(transaction).toHaveBeenCalledOnce();
  });

  it('ConcurrencyConflictError는 트랜잭션 전체를 재시도해서 결국 성공한다', async () => {
    const { db, transaction } = createSaveFailingNTimesDb(
      createPostgresError('40001'),
      2,
    );
    const repository = new SourceEmbeddingPgDrizzleRepository(db);

    await repository.upsert(buildSourceEmbedding());

    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it('ConcurrencyConflictError가 재시도 정책을 소진하면 ConcurrencyConflictError로 reject한다', async () => {
    const { db } = createSaveRejectingDb(createPostgresError('40001'));
    const repository = new SourceEmbeddingPgDrizzleRepository(db);

    const result = repository.upsert(buildSourceEmbedding());

    await expect(result).rejects.toBeInstanceOf(ConcurrencyConflictError);
    await expect(result).rejects.toMatchObject({
      code: 'source_embedding.upsert_failed',
    });
  });
});

function createSaveRejectingDb(error: Error): {
  db: ConstructorParameters<typeof SourceEmbeddingPgDrizzleRepository>[0];
  transaction: ReturnType<typeof vi.fn>;
} {
  const transaction = vi.fn((fn: (tx: unknown) => Promise<void>) =>
    fn({
      delete: () => ({ where: () => Promise.resolve() }),
      insert: () => ({ values: () => Promise.reject(error) }),
    }),
  );
  return {
    db: { transaction } as unknown as ConstructorParameters<
      typeof SourceEmbeddingPgDrizzleRepository
    >[0],
    transaction,
  };
}

function createSaveFailingNTimesDb(
  error: Error,
  failCount: number,
): {
  db: ConstructorParameters<typeof SourceEmbeddingPgDrizzleRepository>[0];
  transaction: ReturnType<typeof vi.fn>;
} {
  let calls = 0;
  const transaction = vi.fn((fn: (tx: unknown) => Promise<void>) => {
    calls += 1;
    return fn({
      delete: () => ({ where: () => Promise.resolve() }),
      insert: () => ({
        values: () =>
          calls <= failCount ? Promise.reject(error) : Promise.resolve(),
      }),
    });
  });
  return {
    db: { transaction } as unknown as ConstructorParameters<
      typeof SourceEmbeddingPgDrizzleRepository
    >[0],
    transaction,
  };
}

function createPostgresError(code: string): Error {
  return Object.assign(new Error('Postgres error'), { code });
}
