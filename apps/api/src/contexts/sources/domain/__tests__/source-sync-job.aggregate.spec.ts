import { SourceSyncJob } from '@contexts/sources/domain';
import { describe, expect, it } from 'vitest';

describe('SourceSyncJob', () => {
  describe('create', () => {
    it('waiting 상태로 sync job을 생성한다', () => {
      const syncJob = SourceSyncJob.create({
        sourceId: 'source-1',
        content: '# Source note',
        fingerprint: 'fingerprint-1',
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
        fingerprint: 'fingerprint-1',
      });

      expect(syncJob.domainEvents).toHaveLength(1);
      expect(syncJob.domainEvents[0]).toMatchObject({
        eventName: 'source.sync_job.created',
        aggregateId: syncJob.id,
        sourceId: 'source-1',
        content: '# Source note',
        fingerprint: 'fingerprint-1',
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

    it('status invariant가 깨지면 throw한다', () => {
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
        fingerprint: 'fingerprint-1',
      });
      syncJob.markCompleted(10);

      expect(syncJob.getProps()).toMatchObject({
        status: 'completed',
        totalChunks: 10,
      });
    });
  });

  describe('isCompleted', () => {
    it('status가 completed면 true를 반환한다', () => {
      const syncJob = SourceSyncJob.create({
        sourceId: 'source-1',
        content: '# Source note',
        fingerprint: 'fingerprint-1',
      });
      syncJob.markCompleted(10);

      expect(syncJob.isCompleted()).toBe(true);
    });

    it.each(['waiting', 'failed'] as const)(
      'status가 %s면 false를 반환한다',
      (status) => {
        const syncJob = SourceSyncJob.restore({
          id: 'source-sync-job-1',
          sourceId: 'source-1',
          fingerprint: 'fingerprint-1',
          status,
        });

        expect(syncJob.isCompleted()).toBe(false);
      },
    );
  });

  describe('isActiveFor', () => {
    it('status가 waiting이고 fingerprint가 같으면 true를 반환한다', () => {
      const syncJob = SourceSyncJob.restore({
        id: 'source-sync-job-1',
        sourceId: 'source-1',
        fingerprint: 'fingerprint-1',
        status: 'waiting',
      });

      expect(syncJob.isActiveFor('fingerprint-1')).toBe(true);
    });

    it('fingerprint가 다르면 false를 반환한다', () => {
      const syncJob = SourceSyncJob.create({
        sourceId: 'source-1',
        content: '# Source note',
        fingerprint: 'fingerprint-1',
      });

      expect(syncJob.isActiveFor('fingerprint-2')).toBe(false);
    });

    it.each(['completed', 'failed'] as const)(
      'status가 %s면 false를 반환한다',
      (status) => {
        const syncJob = SourceSyncJob.restore({
          id: 'source-sync-job-1',
          sourceId: 'source-1',
          fingerprint: 'fingerprint-1',
          status,
        });

        expect(syncJob.isActiveFor('fingerprint-1')).toBe(false);
      },
    );
  });
});
