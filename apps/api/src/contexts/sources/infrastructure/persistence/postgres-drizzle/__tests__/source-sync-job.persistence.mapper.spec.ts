import { SourceSyncJob } from '@contexts/sources/domain';
import { describe, expect, it } from 'vitest';
import { type SourceSyncJobRow } from '../schema';
import { SourceSyncJobPersistenceMapper } from '../source-sync-job.persistence.mapper';

describe('SourceSyncJobPersistenceMapper', () => {
  it('valid sync job row를 SourceSyncJob aggregate로 복원한다', () => {
    const row = createSourceSyncJobRow({
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'pending',
    });

    const result = SourceSyncJobPersistenceMapper.toDomain(row);

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      expect(result.value.id).toBe('source-sync-job-1');
      expect(result.value.getProps()).toMatchObject({
        sourceId: 'source-1',
        status: 'pending',
      });
      expect(result.value.getProps().fingerprint.value).toBe('fingerprint-1');
    }
  });

  it('sync job row의 persisted status가 domain invariant를 깨면 실패한다', () => {
    const row = createSourceSyncJobRow({
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'completed',
    });

    const result = SourceSyncJobPersistenceMapper.toDomain(row);

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

  it('SourceSyncJob aggregate를 sync job insert row로 변환한다', () => {
    const syncJob = SourceSyncJob.create({
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
    })._unsafeUnwrap();

    const row = SourceSyncJobPersistenceMapper.toInsert(syncJob);

    expect(row).toEqual({
      id: syncJob.id,
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'pending',
    });
  });
});

function createSourceSyncJobRow(
  params: Pick<SourceSyncJobRow, 'sourceId' | 'fingerprint' | 'status'>,
): SourceSyncJobRow {
  return {
    id: 'source-sync-job-1',
    sourceId: params.sourceId,
    fingerprint: params.fingerprint,
    status: params.status,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}
