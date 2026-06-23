import { SourceSyncJob } from '@contexts/sources/domain';
import { describe, expect, it } from 'vitest';

describe('SourceSyncJob', () => {
  describe('create', () => {
    it('pending 상태로 sync job을 생성한다', () => {
      const result = SourceSyncJob.create({
        sourceId: 'source-1',
        contentHash: 'hash-1',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const props = result.value.getProps();

        expect(props).toMatchObject({
          sourceId: 'source-1',
          status: 'pending',
        });
        expect(props.id.length).toBeGreaterThan(0);
        expect(props.contentHash.value).toBe('hash-1');
      }
    });

    it('sourceId가 공백뿐이면 실패 Result를 반환한다', () => {
      const result = SourceSyncJob.create({
        sourceId: ' ',
        contentHash: 'hash-1',
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('source_sync_job.source_id_empty');
      }
    });
  });
});
