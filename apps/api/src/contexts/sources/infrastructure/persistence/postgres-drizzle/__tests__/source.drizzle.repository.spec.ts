import { APPLICATION_ERROR_KIND } from '@kernels/application';
import { POSTGRES_SQLSTATE } from '@kernels/infrastructure';
import { describe, expect, it } from 'vitest';
import { buildSourceSyncJob } from '../../../../../../../test/contexts/sources/fixtures/source-sync-job.fixture';
import { buildSource } from '../../../../../../../test/contexts/sources/fixtures/source.fixture';
import { buildSourceSyncJobRow } from '../../../../../../../test/postgres/contexts/sources/fixtures/source-sync-job-row.fixture';
import { buildSourceRow } from '../../../../../../../test/postgres/contexts/sources/fixtures/source-row.fixture';
import { SourceDrizzleRepository } from '../source.drizzle.repository';
import { SourceSyncJobDrizzleRepository } from '../source-sync-job.drizzle.repository';

describe('SourceDrizzleRepository', () => {
  it('save 반환 row가 domain으로 복원되지 않으면 domain error를 반환한다', async () => {
    const repository = new SourceDrizzleRepository(
      createSourceSaveDb([
        buildSourceRow({
          content: '안녕',
          fingerprint: 'fingerprint-1',
          sizeBytes: 1,
        }),
      ]),
    );

    const result = await repository.save(buildSource());

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toMatchObject({
        kind: 'invariant_violation',
        code: 'source.size_mismatch',
        message: 'Source size must match content byte size',
        details: { fields: ['content', 'size'] },
      });
    }
  });

  it('Postgres state conflict를 source repository state conflict로 변환한다', async () => {
    const repository = new SourceDrizzleRepository(
      createSourceSaveRejectingDb(
        createPostgresError(POSTGRES_SQLSTATE.UNIQUE_VIOLATION),
      ),
    );

    const result = await repository.save(buildSource());

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toEqual({
        kind: APPLICATION_ERROR_KIND.STATE_CONFLICT,
        code: 'source_repository.state_conflict',
        message: 'Source Repository state conflict',
        details: { causeCode: 'source_postgres_persistence.conflict' },
      });
    }
  });

  it('unknown failure를 source repository unavailable로 변환한다', async () => {
    const repository = new SourceDrizzleRepository(
      createSourceSaveRejectingDb(new Error('connection failed')),
    );

    const result = await repository.save(buildSource());

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toEqual({
        kind: APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
        code: 'source_repository.unavailable',
        message: 'Source Repository is unavailable',
        details: { causeCode: 'source_postgres_persistence.unavailable' },
      });
    }
  });
});

describe('SourceSyncJobDrizzleRepository', () => {
  it('save 반환 row가 domain으로 복원되지 않으면 domain error를 반환한다', async () => {
    const repository = new SourceSyncJobDrizzleRepository(
      createSourceSyncJobSaveDb([
        buildSourceSyncJobRow({
          sourceId: 'source-1',
          fingerprint: 'fingerprint-1',
          status: 'completed',
        }),
      ]),
    );

    const result = await repository.save(buildSourceSyncJob());

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toMatchObject({
        kind: 'invariant_violation',
        code: 'source_sync_job.status_invalid',
        message: 'Source sync job status is invalid',
        details: { fields: ['status'] },
      });
    }
  });

  it('Postgres state conflict를 source sync job repository state conflict로 변환한다', async () => {
    const repository = new SourceSyncJobDrizzleRepository(
      createSourceSyncJobSaveRejectingDb(
        createPostgresError(POSTGRES_SQLSTATE.FOREIGN_KEY_VIOLATION),
      ),
    );

    const result = await repository.save(buildSourceSyncJob());

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toEqual({
        kind: APPLICATION_ERROR_KIND.STATE_CONFLICT,
        code: 'source_sync_job_repository.state_conflict',
        message: 'Source Sync Job Repository state conflict',
        details: { causeCode: 'source_postgres_persistence.conflict' },
      });
    }
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
