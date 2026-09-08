import { describe, expect, it, vi } from 'vitest';
import {
  InfrastructureException,
  INFRASTRUCTURE_ERROR_KIND,
} from '@kernels/infrastructure';
import { buildSourceEmbedding } from '../../../../../../../test/support/domains/fixtures/source-embedding.fixture';
import { SourceEmbeddingPgDrizzleRepository } from '../source-embedding.pg-drizzle.repository';

describe('SourceEmbeddingPgDrizzleRepository', () => {
  it('Postgres error는 CONFLICT exception으로 전파하고 재시도하지 않는다', async () => {
    const { db, transaction } = createSaveRejectingDb(
      createPostgresError('23505'),
    );
    const repository = new SourceEmbeddingPgDrizzleRepository(db);

    const result = repository.save(buildSourceEmbedding());

    await expect(result).rejects.toBeInstanceOf(InfrastructureException);
    await expect(result).rejects.toMatchObject({
      kind: INFRASTRUCTURE_ERROR_KIND.CONFLICT,
      code: 'source_embedding.save_failed',
    });
    expect(transaction).toHaveBeenCalledOnce();
  });

  it('unknown failure는 UNEXPECTED exception으로 전파하고 재시도하지 않는다', async () => {
    const { db, transaction } = createSaveRejectingDb(
      new Error('connection failed'),
    );
    const repository = new SourceEmbeddingPgDrizzleRepository(db);

    const result = repository.save(buildSourceEmbedding());

    await expect(result).rejects.toBeInstanceOf(InfrastructureException);
    await expect(result).rejects.toMatchObject({
      kind: INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
      code: 'source_embedding.save_failed',
    });
    expect(transaction).toHaveBeenCalledOnce();
  });

  it('CONCURRENCY_CONFLICT는 트랜잭션 전체를 재시도해서 결국 성공한다', async () => {
    const { db, transaction } = createSaveFailingNTimesDb(
      createPostgresError('40001'),
      2,
    );
    const repository = new SourceEmbeddingPgDrizzleRepository(db);

    await repository.save(buildSourceEmbedding());

    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it('CONCURRENCY_CONFLICT가 재시도 정책을 소진하면 CONCURRENCY_CONFLICT exception으로 reject한다', async () => {
    const { db } = createSaveRejectingDb(createPostgresError('40001'));
    const repository = new SourceEmbeddingPgDrizzleRepository(db);

    const result = repository.save(buildSourceEmbedding());

    await expect(result).rejects.toBeInstanceOf(InfrastructureException);
    await expect(result).rejects.toMatchObject({
      kind: INFRASTRUCTURE_ERROR_KIND.CONCURRENCY_CONFLICT,
      code: 'source_embedding.save_failed',
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
