import { describe, expect, it } from 'vitest';
import { buildSourceSyncJob } from '../../../../../../../test/contexts/sources/fixtures/source-sync-job.fixture';
import { buildSource } from '../../../../../../../test/contexts/sources/fixtures/source.fixture';
import { buildSourceSyncJobRow } from '../../../../../../../test/postgres/contexts/sources/fixtures/source-sync-job-row.fixture';
import { buildSourceRow } from '../../../../../../../test/postgres/contexts/sources/fixtures/source-row.fixture';
import { SourceDrizzleRepository } from '../source.drizzle.repository';
import { SourceSyncJobDrizzleRepository } from '../source-sync-job.drizzle.repository';

describe('SourceDrizzleRepository', () => {
  it('save 반환 row가 domain으로 복원되지 않으면 throw한다', async () => {
    const repository = new SourceDrizzleRepository(
      createSourceSaveDb([
        buildSourceRow({
          content: '안녕',
          fingerprint: 'fingerprint-1',
          sizeBytes: 1,
        }),
      ]),
    );

    await expect(repository.save(buildSource())).rejects.toThrow(
      'Source size must match content byte size',
    );
  });

  it('Postgres conflict는 source repository exception으로 전파한다', async () => {
    const repository = new SourceDrizzleRepository(
      createSourceSaveRejectingDb(createPostgresError('23505')),
    );

    await expect(repository.save(buildSource())).rejects.toThrow(
      'Source Repository operation failed',
    );
  });

  it('unknown failure는 source repository exception으로 전파한다', async () => {
    const repository = new SourceDrizzleRepository(
      createSourceSaveRejectingDb(new Error('connection failed')),
    );

    await expect(repository.save(buildSource())).rejects.toThrow(
      'Source Repository operation failed',
    );
  });
});

describe('SourceSyncJobDrizzleRepository', () => {
  it('save 반환 row의 persisted status가 domain invariant를 깨면 throw한다', async () => {
    const repository = new SourceSyncJobDrizzleRepository(
      createSourceSyncJobSaveDb([
        buildSourceSyncJobRow({
          sourceId: 'source-1',
          fingerprint: 'fingerprint-1',
          status: 'completed',
        }),
      ]),
    );

    await expect(repository.save(buildSourceSyncJob())).rejects.toThrow(
      'Source sync job status is invalid',
    );
  });

  it('Postgres conflict는 source sync job repository exception으로 전파한다', async () => {
    const repository = new SourceSyncJobDrizzleRepository(
      createSourceSyncJobSaveRejectingDb(createPostgresError('23503')),
    );

    await expect(repository.save(buildSourceSyncJob())).rejects.toThrow(
      'Source Sync Job Repository operation failed',
    );
  });

  it('unknown failure는 source sync job repository exception으로 전파한다', async () => {
    const repository = new SourceSyncJobDrizzleRepository(
      createSourceSyncJobSaveRejectingDb(new Error('connection failed')),
    );

    await expect(repository.save(buildSourceSyncJob())).rejects.toThrow(
      'Source Sync Job Repository operation failed',
    );
  });
});

function createSourceSaveDb(
  returningRows: unknown[],
): ConstructorParameters<typeof SourceDrizzleRepository>[0] {
  return {
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () => Promise.resolve(returningRows),
        }),
      }),
    }),
  } as unknown as ConstructorParameters<typeof SourceDrizzleRepository>[0];
}

function createSourceSaveRejectingDb(
  error: Error,
): ConstructorParameters<typeof SourceDrizzleRepository>[0] {
  return {
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () => Promise.reject(error),
        }),
      }),
    }),
  } as unknown as ConstructorParameters<typeof SourceDrizzleRepository>[0];
}

function createSourceSyncJobSaveDb(
  returningRows: unknown[],
): ConstructorParameters<typeof SourceSyncJobDrizzleRepository>[0] {
  return {
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve(returningRows),
      }),
    }),
  } as unknown as ConstructorParameters<
    typeof SourceSyncJobDrizzleRepository
  >[0];
}

function createSourceSyncJobSaveRejectingDb(
  error: Error,
): ConstructorParameters<typeof SourceSyncJobDrizzleRepository>[0] {
  return {
    insert: () => ({
      values: () => ({
        returning: () => Promise.reject(error),
      }),
    }),
  } as unknown as ConstructorParameters<
    typeof SourceSyncJobDrizzleRepository
  >[0];
}

function createPostgresError(code: string): Error {
  return Object.assign(new Error('Postgres error'), { code });
}
