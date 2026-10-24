import { SourceFingerprint, SourceSyncJob } from '@contexts/library/domain';
import { describe, expect, it } from 'vitest';

describe('SourceSyncJob', () => {
  describe('create', () => {
    it('waiting 상태로 만들고 받은 fingerprint를 기록한다', () => {
      const syncJob = SourceSyncJob.create({
        sourceId: 'source-1',
        content: '# Source note',
        fingerprint: SourceFingerprint.of('fingerprint-1'),
      });
      const props = syncJob.getProps();

      expect(props).toMatchObject({
        sourceId: 'source-1',
        status: 'waiting',
        totalChunks: null,
      });
      expect(props.id.length).toBeGreaterThan(0);
      expect(props.fingerprint.unpack()).toBe('fingerprint-1');
    });

    it('생성 시 SourceSyncJobCreatedDomainEvent를 기록한다', () => {
      const syncJob = SourceSyncJob.create({
        sourceId: 'source-1',
        content: '# Source note',
        fingerprint: SourceFingerprint.of('fingerprint-1'),
      });

      expect(syncJob.domainEvents).toHaveLength(1);
      expect(syncJob.domainEvents[0]).toMatchObject({
        eventName: 'source.sync_job.created',
        aggregateId: syncJob.id,
        sourceId: 'source-1',
        content: '# Source note',
      });
    });
  });

  describe('restore', () => {
    it('저장된 sync job id를 그대로 보존한다', () => {
      const syncJob = SourceSyncJob.restore({
        id: ' source-sync-job-1 ',
        sourceId: 'source-1',
        fingerprint: ' fingerprint-1 ',
        status: 'waiting',
      });
      const props = syncJob.getProps();

      expect(props.id).toBe(' source-sync-job-1 ');
      expect(props.sourceId).toBe('source-1');
      expect(props.fingerprint.unpack()).toBe('fingerprint-1');
      expect(props.status).toBe('waiting');
    });

    it('복원된 sync job은 domain event를 기록하지 않는다', () => {
      const syncJob = SourceSyncJob.restore({
        id: 'source-sync-job-1',
        sourceId: 'source-1',
        fingerprint: 'fingerprint-1',
        status: 'waiting',
      });

      expect(syncJob.domainEvents).toEqual([]);
    });

    it('library.syncJob-1: status invariant가 깨지면 throw한다', () => {
      expect(() =>
        SourceSyncJob.restore({
          id: 'source-sync-job-1',
          sourceId: 'source-1',
          fingerprint: 'fingerprint-1',
          status: 'unknown_status',
        }),
      ).toThrow('Source sync job status is invalid');
    });
  });

  describe('markCompleted', () => {
    it('completed 상태로 전환한다', () => {
      const syncJob = SourceSyncJob.create({
        sourceId: 'source-1',
        content: '# Source note',
        fingerprint: SourceFingerprint.of('fingerprint-1'),
      });
      syncJob.markCompleted(10);

      expect(syncJob.getProps()).toMatchObject({
        status: 'completed',
        totalChunks: 10,
      });
    });
  });

  describe('isWaiting', () => {
    it('library.sync-8: status가 waiting이면 true를 반환한다', () => {
      expect(restoreSyncJob('waiting').isWaiting()).toBe(true);
    });

    it.each(['completed', 'failed'] as const)(
      'library.sync-8: status가 %s면 false를 반환한다',
      (status) => {
        expect(restoreSyncJob(status).isWaiting()).toBe(false);
      },
    );
  });

  describe('isWaitingOrCompletedFor', () => {
    it.each(['waiting', 'completed'] as const)(
      'library.sync-7: status가 %s이고 fingerprint가 같으면 true를 반환한다',
      (status) => {
        expect(
          restoreSyncJob(status).isWaitingOrCompletedFor(
            SourceFingerprint.of('fingerprint-1'),
          ),
        ).toBe(true);
      },
    );

    it('library.sync-7: fingerprint가 다르면 false를 반환한다', () => {
      expect(
        restoreSyncJob('completed').isWaitingOrCompletedFor(
          SourceFingerprint.of('fingerprint-2'),
        ),
      ).toBe(false);
    });

    it('library.sync-7: status가 failed면 fingerprint가 같아도 false를 반환한다', () => {
      expect(
        restoreSyncJob('failed').isWaitingOrCompletedFor(
          SourceFingerprint.of('fingerprint-1'),
        ),
      ).toBe(false);
    });
  });
});

function restoreSyncJob(
  status: 'waiting' | 'completed' | 'failed',
): SourceSyncJob {
  return SourceSyncJob.restore({
    id: 'source-sync-job-1',
    sourceId: 'source-1',
    fingerprint: 'fingerprint-1',
    status,
  });
}
