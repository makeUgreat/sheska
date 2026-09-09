import { describe, expect, it, vi } from 'vitest';
import { SourceSyncJob } from '@contexts/sources/domain';
import { GetSourceSyncJobUseCase } from '../get-source-sync-job.use-case';

describe('GetSourceSyncJobUseCase', () => {
  it('sync job을 조회한다', async () => {
    const syncJob = SourceSyncJob.restore({
      id: 'sync-job-1',
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'processing',
      totalChunks: 3,
      processedChunks: 1,
    });
    const syncJobs = { get: vi.fn().mockResolvedValue(syncJob) };
    const useCase = new GetSourceSyncJobUseCase(syncJobs as never);

    await expect(
      useCase.execute({ syncJobId: 'sync-job-1' }),
    ).resolves.toMatchObject({
      syncJobId: 'sync-job-1',
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'processing',
      totalChunks: 3,
      processedChunks: 1,
    });
  });

  it('repository exception을 전파한다', async () => {
    const error = new Error('Source sync job not found');
    const syncJobs = {
      get: vi.fn().mockRejectedValue(error),
    };
    const useCase = new GetSourceSyncJobUseCase(syncJobs as never);

    await expect(useCase.execute({ syncJobId: 'missing' })).rejects.toBe(error);
  });
});
