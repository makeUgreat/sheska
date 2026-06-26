import { SourceSyncJob } from '@contexts/sources/domain';
import { describe, expect, it } from 'vitest';

describe('SourceSyncJob', () => {
  describe('create', () => {
    it('pending 상태로 sync job을 생성한다', () => {
      const result = SourceSyncJob.create({
        sourceId: 'source-1',
        fingerprint: 'fingerprint-1',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const props = result.value.getProps();

        expect(props).toMatchObject({
          sourceId: 'source-1',
          status: 'pending',
        });
        expect(props.id.length).toBeGreaterThan(0);
        expect(props.fingerprint.value).toBe('fingerprint-1');
      }
    });

    it('sourceId가 공백뿐이면 실패 Result를 반환한다', () => {
      const result = SourceSyncJob.create({
        sourceId: ' ',
        fingerprint: 'fingerprint-1',
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('source_sync_job.source_id_empty');
      }
    });
  });

  describe('restore', () => {
    it('저장된 sync job id로 sync job을 복원한다', () => {
      const result = SourceSyncJob.restore({
        id: ' source-sync-job-1 ',
        sourceId: ' source-1 ',
        fingerprint: ' fingerprint-1 ',
        status: 'pending',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const props = result.value.getProps();

        expect(props.id).toBe('source-sync-job-1');
        expect(props.sourceId).toBe('source-1');
        expect(props.fingerprint.value).toBe('fingerprint-1');
        expect(props.status).toBe('pending');
      }
    });

    it('복원된 sync job은 domain event를 기록하지 않는다', () => {
      const result = SourceSyncJob.restore({
        id: 'source-sync-job-1',
        sourceId: 'source-1',
        fingerprint: 'fingerprint-1',
        status: 'pending',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.domainEvents).toEqual([]);
      }
    });

    it('status가 pending이 아니면 실패 Result를 반환한다', () => {
      const result = SourceSyncJob.restore({
        id: 'source-sync-job-1',
        sourceId: 'source-1',
        fingerprint: 'fingerprint-1',
        status: 'completed',
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('source_sync_job.status_invalid');
      }
    });
  });
});
