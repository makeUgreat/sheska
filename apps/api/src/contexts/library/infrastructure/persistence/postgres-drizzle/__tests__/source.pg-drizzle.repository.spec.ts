import { describe, expect, it } from 'vitest';
import { buildSourceSyncJob } from '../../../../../../../test/support/domains/fixtures/source-sync-job.fixture';
import { buildSource } from '../../../../../../../test/support/domains/fixtures/source.fixture';
import { SourcePgDrizzleRepository } from '../source.pg-drizzle.repository';
import { SourceSyncJobPgDrizzleRepository } from '../source-sync-job.pg-drizzle.repository';
import { ConstraintViolationError, UnexpectedError } from '@core/errors';

describe('SourcePgDrizzleRepository', () => {
  it('unique violation은 ConstraintViolationError로 전파한다', async () => {
    const repository = new SourcePgDrizzleRepository(
      createSourceSaveRejectingDb(createPostgresError('23505')),
    );

    const result = repository.insert(buildSource());

    await expect(result).rejects.toBeInstanceOf(ConstraintViolationError);
    await expect(result).rejects.toMatchObject({
      code: 'source.external_source_id_already_exists',
    });
  });

  it('unknown failure는 UnexpectedError로 전파한다', async () => {
    const repository = new SourcePgDrizzleRepository(
      createSourceSaveRejectingDb(new Error('connection failed')),
    );

    const result = repository.insert(buildSource());

    await expect(result).rejects.toBeInstanceOf(UnexpectedError);
    await expect(result).rejects.toMatchObject({
      code: 'source.insert_failed',
    });
  });
});

describe('SourceSyncJobPgDrizzleRepository', () => {
  it('unique violation은 ConstraintViolationError로 전파한다', async () => {
    const repository = new SourceSyncJobPgDrizzleRepository(
      createSourceSyncJobSaveRejectingDb(createPostgresError('23505')),
    );

    const result = repository.insert(buildSourceSyncJob());

    await expect(result).rejects.toBeInstanceOf(ConstraintViolationError);
    await expect(result).rejects.toMatchObject({
      code: 'source_sync_job.already_active',
    });
  });

  it('unknown failure는 UnexpectedError로 전파한다', async () => {
    const repository = new SourceSyncJobPgDrizzleRepository(
      createSourceSyncJobSaveRejectingDb(new Error('connection failed')),
    );

    const result = repository.insert(buildSourceSyncJob());

    await expect(result).rejects.toBeInstanceOf(UnexpectedError);
    await expect(result).rejects.toMatchObject({
      code: 'source_sync_job.insert_failed',
    });
  });
});

function createSourceSaveRejectingDb(
  error: Error,
): ConstructorParameters<typeof SourcePgDrizzleRepository>[0] {
  return {
    insert: () => ({
      values: () => ({
        returning: () => Promise.reject(error),
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
        returning: () => Promise.reject(error),
      }),
    }),
  } as unknown as ConstructorParameters<
    typeof SourceSyncJobPgDrizzleRepository
  >[0];
}

function createPostgresError(code: string): Error {
  return Object.assign(new Error('Postgres error'), { code });
}
