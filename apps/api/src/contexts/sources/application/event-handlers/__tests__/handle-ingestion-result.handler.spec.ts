import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { type SourceSyncJobRepository } from '@contexts/sources/domain';
import { HandleIngestionResultHandler } from '../handle-ingestion-result.handler';
import { buildSourceSyncJob } from '../../../../../../test/support/domains/fixtures/source-sync-job.fixture';

type SourceSyncJobRepositoryMock = {
  find: MockedFunction<SourceSyncJobRepository['find']>;
  save: MockedFunction<SourceSyncJobRepository['save']>;
};

describe('HandleIngestionResultHandler', () => {
  describe('onStarted', () => {
    it('sync job을 processing 상태로 전환하고 totalChunks를 저장한다', async () => {
      const syncJob = buildSourceSyncJob({ sourceId: 'source-1' });
      const syncJobs = createSyncJobRepositoryMock();
      syncJobs.find.mockResolvedValue(syncJob);
      const handler = new HandleIngestionResultHandler(
        syncJobs as unknown as SourceSyncJobRepository,
      );

      await handler.onStarted({ syncJobId: syncJob.id, totalChunks: 5 });

      expect(syncJobs.save).toHaveBeenCalledOnce();
      const saved = syncJobs.save.mock.calls[0][0];
      expect(saved.getProps()).toMatchObject({
        status: 'processing',
        totalChunks: 5,
        processedChunks: 0,
      });
    });

    it('sync job이 없으면 아무것도 하지 않는다', async () => {
      const syncJobs = createSyncJobRepositoryMock();
      syncJobs.find.mockResolvedValue(null);
      const handler = new HandleIngestionResultHandler(
        syncJobs as unknown as SourceSyncJobRepository,
      );

      await handler.onStarted({ syncJobId: 'unknown', totalChunks: 5 });

      expect(syncJobs.save).not.toHaveBeenCalled();
    });
  });

  describe('onProgress', () => {
    it('sync job의 processedChunks를 갱신한다', async () => {
      const syncJob = buildSourceSyncJob({ sourceId: 'source-1' });
      syncJob.markProcessing(5);
      const syncJobs = createSyncJobRepositoryMock();
      syncJobs.find.mockResolvedValue(syncJob);
      const handler = new HandleIngestionResultHandler(
        syncJobs as unknown as SourceSyncJobRepository,
      );

      await handler.onProgress({ syncJobId: syncJob.id, processedChunks: 2 });

      expect(syncJobs.save).toHaveBeenCalledOnce();
      const saved = syncJobs.save.mock.calls[0][0];
      expect(saved.getProps().processedChunks).toBe(2);
    });

    it('sync job이 없으면 아무것도 하지 않는다', async () => {
      const syncJobs = createSyncJobRepositoryMock();
      syncJobs.find.mockResolvedValue(null);
      const handler = new HandleIngestionResultHandler(
        syncJobs as unknown as SourceSyncJobRepository,
      );

      await handler.onProgress({ syncJobId: 'unknown', processedChunks: 2 });

      expect(syncJobs.save).not.toHaveBeenCalled();
    });
  });

  describe('onCompleted', () => {
    it('sync job을 completed 상태로 전환한다', async () => {
      const syncJob = buildSourceSyncJob({ sourceId: 'source-1' });
      const syncJobs = createSyncJobRepositoryMock();
      syncJobs.find.mockResolvedValue(syncJob);
      const handler = new HandleIngestionResultHandler(
        syncJobs as unknown as SourceSyncJobRepository,
      );

      await handler.onCompleted({ syncJobId: syncJob.id });

      expect(syncJobs.save.mock.calls[0][0].getProps().status).toBe(
        'completed',
      );
    });
  });

  describe('onFailed', () => {
    it('sync job을 failed 상태로 전환한다', async () => {
      const syncJob = buildSourceSyncJob({ sourceId: 'source-1' });
      const syncJobs = createSyncJobRepositoryMock();
      syncJobs.find.mockResolvedValue(syncJob);
      const handler = new HandleIngestionResultHandler(
        syncJobs as unknown as SourceSyncJobRepository,
      );

      await handler.onFailed({ syncJobId: syncJob.id });

      expect(syncJobs.save.mock.calls[0][0].getProps().status).toBe('failed');
    });
  });
});

function createSyncJobRepositoryMock(): SourceSyncJobRepositoryMock {
  return {
    find: vi.fn<SourceSyncJobRepository['find']>(),
    save: vi
      .fn<SourceSyncJobRepository['save']>()
      .mockImplementation((job) => Promise.resolve(job)),
  };
}
