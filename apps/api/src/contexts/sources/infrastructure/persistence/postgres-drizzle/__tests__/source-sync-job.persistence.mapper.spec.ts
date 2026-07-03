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

    const syncJob = SourceSyncJobPersistenceMapper.toDomain(row);

    expect(syncJob.id).toBe('source-sync-job-1');
    expect(syncJob.getProps()).toMatchObject({
      sourceId: 'source-1',
      status: 'pending',
    });
    expect(syncJob.getProps().fingerprint.unpack()).toBe('fingerprint-1');
  });

  it('sync job row의 persisted status가 domain invariant를 깨면 throw한다', () => {
    const row = buildSourceSyncJobRow({
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'unknown_status',
    });

    expect(() => SourceSyncJobPersistenceMapper.toDomain(row)).toThrow(
      'Source sync job status is invalid',
    );
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
