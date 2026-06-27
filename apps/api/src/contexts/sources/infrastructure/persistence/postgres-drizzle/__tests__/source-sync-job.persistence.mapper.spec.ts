import { describe, expect, it } from 'vitest';
import { buildSourceSyncJob } from '../../../../../../../test/contexts/sources/fixtures/source-sync-job.fixture';
import { buildSourceSyncJobRow } from '../../../../../../../test/postgres/contexts/sources/fixtures/source-sync-job-row.fixture';
import { SourceSyncJobPersistenceMapper } from '../source-sync-job.persistence.mapper';

describe('SourceSyncJobPersistenceMapper', () => {
  it('valid sync job row를 SourceSyncJob aggregate로 복원한다', () => {
    const row = buildSourceSyncJobRow({
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
    const row = buildSourceSyncJobRow({
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
    const syncJob = buildSourceSyncJob();

    const row = SourceSyncJobPersistenceMapper.toInsert(syncJob);

    expect(row).toEqual({
      id: syncJob.id,
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'pending',
    });
  });
});
