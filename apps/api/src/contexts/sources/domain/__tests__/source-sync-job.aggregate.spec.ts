import { SourceSyncJob } from '@contexts/sources/domain';
import { describe, expect, it } from 'vitest';

describe('SourceSyncJob', () => {
  describe('create', () => {
    it('pending 상태로 sync job을 생성한다', () => {
      const syncJob = SourceSyncJob.create({
        sourceId: 'source-1',
        content: '# Source note',
        fingerprint: 'fingerprint-1',
      });
      const props = syncJob.getProps();

      expect(props).toMatchObject({
        sourceId: 'source-1',
        status: 'pending',
        totalChunks: null,
        processedChunks: 0,
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
        status: 'pending',
      });
      const props = syncJob.getProps();

      expect(props.id).toBe(' source-sync-job-1 ');
      expect(props.sourceId).toBe('source-1');
      expect(props.fingerprint.unpack()).toBe('fingerprint-1');
      expect(props.status).toBe('pending');
    });

    it('복원된 sync job은 domain event를 기록하지 않는다', () => {
      const syncJob = SourceSyncJob.restore({
        id: 'source-sync-job-1',
        sourceId: 'source-1',
        fingerprint: 'fingerprint-1',
        status: 'pending',
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

  describe('markProcessing', () => {
    it('processing 상태로 전환하고 totalChunks를 기록한다', () => {
      const syncJob = SourceSyncJob.create({
        sourceId: 'source-1',
        content: '# Source note',
        fingerprint: 'fingerprint-1',
      });

      syncJob.markProcessing(10);

      expect(syncJob.getProps()).toMatchObject({
        status: 'processing',
        totalChunks: 10,
        processedChunks: 0,
      });
    });
  });

  describe('recordProgress', () => {
    it('processedChunks를 갱신한다', () => {
      const syncJob = SourceSyncJob.create({
        sourceId: 'source-1',
        content: '# Source note',
        fingerprint: 'fingerprint-1',
      });
      syncJob.markProcessing(10);

      syncJob.recordProgress(3);

      expect(syncJob.getProps().processedChunks).toBe(3);
    });

    it('processedChunks가 totalChunks를 초과하면 throw한다', () => {
      const syncJob = SourceSyncJob.create({
        sourceId: 'source-1',
        content: '# Source note',
        fingerprint: 'fingerprint-1',
      });
      syncJob.markProcessing(2);

      expect(() => syncJob.recordProgress(3)).toThrow(
        'Source sync job processed chunk count exceeds total chunks',
      );
    });
  });

  describe('isCompleted', () => {
    it('status가 completed면 true를 반환한다', () => {
      const syncJob = SourceSyncJob.create({
        sourceId: 'source-1',
        content: '# Source note',
        fingerprint: 'fingerprint-1',
      });
      syncJob.markCompleted();

      expect(syncJob.isCompleted()).toBe(true);
    });

    it.each(['pending', 'processing', 'failed'] as const)(
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
});
