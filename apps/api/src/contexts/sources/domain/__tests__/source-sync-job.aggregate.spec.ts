import { SourceSyncJob } from '@contexts/sources/domain';
import { describe, expect, it } from 'vitest';

describe('SourceSyncJob', () => {
  describe('create', () => {
    it('pending 상태로 sync job을 생성한다', () => {
      const syncJob = SourceSyncJob.create({
        sourceId: 'source-1',
        fingerprint: 'fingerprint-1',
      });
      const props = syncJob.getProps();

      expect(props).toMatchObject({
        sourceId: 'source-1',
        status: 'pending',
      });
      expect(props.id.length).toBeGreaterThan(0);
      expect(props.fingerprint.unpack()).toBe('fingerprint-1');
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
          status: 'completed',
        }),
      ).toThrow('Source sync job status is invalid');
    });
  });
});
