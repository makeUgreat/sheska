import { describe, expect, it, vi } from 'vitest';
import { SourceSyncJob } from '@contexts/sources/domain';
import { GetSourceSyncJobUseCase } from '../get-source-sync-job.use-case';

describe('GetSourceSyncJobUseCase', () => {
  const logger = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  it('sync job을 조회한다', async () => {
    const syncJob = SourceSyncJob.restore({
      id: 'sync-job-1',
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'waiting',
    });
    const syncJobs = { get: vi.fn().mockResolvedValue(syncJob) };
    const progress = {
      find: vi.fn().mockResolvedValue({ totalChunks: 3, processedChunks: 2 }),
    };
    const useCase = new GetSourceSyncJobUseCase(
      syncJobs as never,
      progress,
      logger,
    );

    await expect(
      useCase.execute({ syncJobId: 'sync-job-1' }),
    ).resolves.toMatchObject({
      syncJobId: 'sync-job-1',
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'processing',
      totalChunks: 3,
      processedChunks: 2,
    });
  });

  it('workflow progress가 없으면 저장된 progress를 반환한다', async () => {
    const syncJob = SourceSyncJob.restore({
      id: 'sync-job-1',
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'waiting',
    });
    const useCase = new GetSourceSyncJobUseCase(
      { get: vi.fn().mockResolvedValue(syncJob) } as never,
      { find: vi.fn().mockResolvedValue(null) },
      logger,
    );

    await expect(
      useCase.execute({ syncJobId: 'sync-job-1' }),
    ).resolves.toMatchObject({
      status: 'waiting',
      totalChunks: null,
      processedChunks: null,
    });
  });

  it('완료된 sync job도 workflow progress가 없으면 null을 반환한다', async () => {
    const syncJob = SourceSyncJob.restore({
      id: 'sync-job-1',
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'completed',
      totalChunks: 3,
    });
    const useCase = new GetSourceSyncJobUseCase(
      { get: vi.fn().mockResolvedValue(syncJob) } as never,
      { find: vi.fn().mockResolvedValue(null) },
      logger,
    );

    await expect(
      useCase.execute({ syncJobId: 'sync-job-1' }),
    ).resolves.toMatchObject({ totalChunks: 3, processedChunks: null });
  });

  it('workflow progress 조회가 실패하면 저장된 progress로 폴백한다', async () => {
    const syncJob = SourceSyncJob.restore({
      id: 'sync-job-1',
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'waiting',
    });
    const progressError = new Error('Redis unavailable');
    const useCase = new GetSourceSyncJobUseCase(
      { get: vi.fn().mockResolvedValue(syncJob) } as never,
      { find: vi.fn().mockRejectedValue(progressError) },
      logger,
    );

    await expect(
      useCase.execute({ syncJobId: 'sync-job-1' }),
    ).resolves.toMatchObject({
      status: 'waiting',
      totalChunks: null,
      processedChunks: null,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to read live sync job progress',
      progressError,
      { syncJobId: 'sync-job-1' },
    );
  });

  it('repository exception을 전파한다', async () => {
    const error = new Error('Source sync job not found');
    const syncJobs = {
      get: vi.fn().mockRejectedValue(error),
    };
    const useCase = new GetSourceSyncJobUseCase(
      syncJobs as never,
      { find: vi.fn() },
      logger,
    );

    await expect(useCase.execute({ syncJobId: 'missing' })).rejects.toBe(error);
  });
});
