import { describe, expect, it } from 'vitest';
import {
  InfrastructureException,
  INFRASTRUCTURE_ERROR_KIND,
} from '@kernels/infrastructure';
import { buildSourceSyncJob } from '../../../../../../../test/contexts/sources/fixtures/source-sync-job.fixture';
import { buildSource } from '../../../../../../../test/contexts/sources/fixtures/source.fixture';
import { buildSourceRow } from '../../../../../../../test/postgres/contexts/sources/fixtures/source-row.fixture';
import { SourceDrizzleRepository } from '../source.drizzle.repository';
import { SourceSyncJobDrizzleRepository } from '../source-sync-job.drizzle.repository';

describe('SourceDrizzleRepository', () => {
  it('save 반환 row가 domain으로 복원되지 않으면 RESTORE_FAILED exception을 throw한다', async () => {
    const repository = new SourceDrizzleRepository(
      createSourceSaveDb([
        buildSourceRow({
          content: '안녕',
          fingerprint: 'fingerprint-1',
          sizeBytes: 1,
        }),
      ]),
    );

    const result = repository.save(buildSource());

    await expect(result).rejects.toBeInstanceOf(InfrastructureException);
    await expect(result).rejects.toMatchObject({
      error: {
        kind: INFRASTRUCTURE_ERROR_KIND.RESTORE_FAILED,
        code: 'source.restore_failed',
      },
    });
  });

  it('Postgres conflict는 CONFLICT exception으로 전파한다', async () => {
    const repository = new SourceDrizzleRepository(
      createSourceSaveRejectingDb(createPostgresError('23505')),
    );

    const result = repository.save(buildSource());

    await expect(result).rejects.toBeInstanceOf(InfrastructureException);
    await expect(result).rejects.toMatchObject({
      error: {
        kind: INFRASTRUCTURE_ERROR_KIND.CONFLICT,
        code: 'source.save_failed',
      },
    });
  });

  it('unknown failure는 UNEXPECTED exception으로 전파한다', async () => {
    const repository = new SourceDrizzleRepository(
      createSourceSaveRejectingDb(new Error('connection failed')),
    );

    const result = repository.save(buildSource());

    await expect(result).rejects.toBeInstanceOf(InfrastructureException);
    await expect(result).rejects.toMatchObject({
      error: {
        kind: INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
        code: 'source.save_failed',
      },
    });
  });
});

describe('SourceSyncJobDrizzleRepository', () => {
  it('Postgres conflict는 CONFLICT exception으로 전파한다', async () => {
    const repository = new SourceSyncJobDrizzleRepository(
      createSourceSyncJobSaveRejectingDb(createPostgresError('23503')),
    );

    const result = repository.save(buildSourceSyncJob());

    await expect(result).rejects.toBeInstanceOf(InfrastructureException);
    await expect(result).rejects.toMatchObject({
      error: {
        kind: INFRASTRUCTURE_ERROR_KIND.CONFLICT,
        code: 'source_sync_job.save_failed',
      },
    });
  });

  it('unknown failure는 UNEXPECTED exception으로 전파한다', async () => {
    const repository = new SourceSyncJobDrizzleRepository(
      createSourceSyncJobSaveRejectingDb(new Error('connection failed')),
    );

    const result = repository.save(buildSourceSyncJob());

    await expect(result).rejects.toBeInstanceOf(InfrastructureException);
    await expect(result).rejects.toMatchObject({
      error: {
        kind: INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
        code: 'source_sync_job.save_failed',
      },
    });
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
