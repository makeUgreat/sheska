import { describe, expect, it, vi } from 'vitest';
import { buildSourceEmbedding } from '../../../../../../../test/support/domains/fixtures/source-embedding.fixture';
import { SourceEmbeddingPgDrizzleRepository } from '../source-embedding.pg-drizzle.repository';
import {
  ConcurrencyConflictError,
  ConstraintViolationError,
  UnexpectedError,
} from '@core/errors';

describe('SourceEmbeddingPgDrizzleRepository', () => {
  it('저장된 것보다 나중에 만든 sync job의 결과면 청크를 교체한다', async () => {
    const { db, deleteChunks } = createStoredDb('sync-job-1');
    const repository = new SourceEmbeddingPgDrizzleRepository(db);

    const result = await repository.upsert(
      buildSourceEmbedding({ syncJobId: 'sync-job-2' }),
    );

    expect(result).toEqual({ replaced: true });
    expect(deleteChunks).toHaveBeenCalledOnce();
  });

  it('저장된 것보다 먼저 만든 sync job의 결과면 청크를 건드리지 않는다', async () => {
    const { db, deleteChunks } = createStoredDb('sync-job-2');
    const repository = new SourceEmbeddingPgDrizzleRepository(db);

    const result = await repository.upsert(
      buildSourceEmbedding({ syncJobId: 'sync-job-1' }),
    );

    expect(result).toEqual({ replaced: false });
    expect(deleteChunks).not.toHaveBeenCalled();
  });

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

type RepositoryDb = ConstructorParameters<
  typeof SourceEmbeddingPgDrizzleRepository
>[0];

interface FakeTransactionOptions {
  storedSyncJobId?: string;
  insertChunks?: () => Promise<void>;
}

function buildFakeTransaction({
  storedSyncJobId,
  insertChunks = () => Promise.resolve(),
}: FakeTransactionOptions = {}) {
  const deleteChunks = vi.fn(() => Promise.resolve());
  const stored = storedSyncJobId ? [{ syncJobId: storedSyncJobId }] : [];
  const tx = {
    execute: () => Promise.resolve(),
    select: () => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve(stored) }) }),
    }),
    delete: () => ({ where: deleteChunks }),
    insert: () => ({ values: insertChunks }),
  };
  return { tx, deleteChunks };
}

function createStoredDb(storedSyncJobId?: string): {
  db: RepositoryDb;
  deleteChunks: ReturnType<typeof vi.fn>;
} {
  const { tx, deleteChunks } = buildFakeTransaction({ storedSyncJobId });
  const transaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(tx));
  return {
    db: { transaction } as unknown as RepositoryDb,
    deleteChunks,
  };
}

function createSaveRejectingDb(error: Error): {
  db: RepositoryDb;
  transaction: ReturnType<typeof vi.fn>;
} {
  const transaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
    fn(buildFakeTransaction({ insertChunks: () => Promise.reject(error) }).tx),
  );
  return { db: { transaction } as unknown as RepositoryDb, transaction };
}

function createSaveFailingNTimesDb(
  error: Error,
  failCount: number,
): {
  db: RepositoryDb;
  transaction: ReturnType<typeof vi.fn>;
} {
  let calls = 0;
  const transaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => {
    calls += 1;
    const failing = calls <= failCount;
    return fn(
      buildFakeTransaction({
        insertChunks: () =>
          failing ? Promise.reject(error) : Promise.resolve(),
      }).tx,
    );
  });
  return { db: { transaction } as unknown as RepositoryDb, transaction };
}

function createPostgresError(code: string): Error {
  return Object.assign(new Error('Postgres error'), { code });
}
