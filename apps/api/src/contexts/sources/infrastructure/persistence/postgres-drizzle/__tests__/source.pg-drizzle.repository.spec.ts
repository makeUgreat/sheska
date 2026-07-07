import { describe, expect, it } from 'vitest';
import {
  InfrastructureException,
  INFRASTRUCTURE_ERROR_KIND,
} from '@kernels/infrastructure';
import { buildSourceSyncJob } from '../../../../../../../test/domains/fixtures/source-sync-job.fixture';
import { buildSource } from '../../../../../../../test/domains/fixtures/source.fixture';
import { SourcePgDrizzleRepository } from '../source.pg-drizzle.repository';
import { SourceSyncJobPgDrizzleRepository } from '../source-sync-job.pg-drizzle.repository';

describe('SourcePgDrizzleRepository', () => {
  it('Postgres conflict는 CONFLICT exception으로 전파한다', async () => {
    const repository = new SourcePgDrizzleRepository(
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
    const repository = new SourcePgDrizzleRepository(
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

describe('SourceSyncJobPgDrizzleRepository', () => {
  it('Postgres conflict는 CONFLICT exception으로 전파한다', async () => {
    const repository = new SourceSyncJobPgDrizzleRepository(
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
    const repository = new SourceSyncJobPgDrizzleRepository(
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

function createSourceSaveRejectingDb(
  error: Error,
): ConstructorParameters<typeof SourcePgDrizzleRepository>[0] {
  return {
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () => Promise.reject(error),
        }),
      }),
    }),
  } as unknown as ConstructorParameters<typeof SourcePgDrizzleRepository>[0];
}

function createSourceSyncJobSaveRejectingDb(
  error: Error,
): ConstructorParameters<typeof SourceSyncJobPgDrizzleRepository>[0] {
  return {
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () => Promise.reject(error),
        }),
      }),
    }),
  } as unknown as ConstructorParameters<
    typeof SourceSyncJobPgDrizzleRepository
  >[0];
}

function createPostgresError(code: string): Error {
  return Object.assign(new Error('Postgres error'), { code });
}
