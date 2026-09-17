import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { type SourceSyncJobRepository } from '@contexts/sources/domain';
import { buildSourceSyncJob } from '../../../../../../test/support/domains/fixtures/source-sync-job.fixture';
import { ApplyIngestionUpdateUseCase } from '../apply-ingestion-update.use-case';

type SourceSyncJobRepositoryMock = {
  find: MockedFunction<SourceSyncJobRepository['find']>;
  save: MockedFunction<SourceSyncJobRepository['save']>;
};

describe('ApplyIngestionUpdateUseCase', () => {
  it('completed update를 totalChunks와 함께 sync job에 적용한다', async () => {
    const syncJob = buildSourceSyncJob({ sourceId: 'source-1' });
    const syncJobs = createSyncJobRepositoryMock(syncJob);
    const useCase = createUseCase(syncJobs);

    await useCase.execute({
      kind: 'completed',
      syncJobId: syncJob.id,
      totalChunks: 5,
    });

    expect(syncJob.getProps()).toMatchObject({
      status: 'completed',
      totalChunks: 5,
    });
    expect(syncJobs.save).toHaveBeenCalledWith(syncJob);
  });

  it('failed update를 sync job에 적용한다', async () => {
    const syncJob = buildSourceSyncJob({ sourceId: 'source-1' });
    const syncJobs = createSyncJobRepositoryMock(syncJob);
    const useCase = createUseCase(syncJobs);

    await useCase.execute({ kind: 'failed', syncJobId: syncJob.id });

    expect(syncJob.getProps().status).toBe('failed');
    expect(syncJobs.save).toHaveBeenCalledWith(syncJob);
  });

  it('sync job이 없으면 update를 무시한다', async () => {
    const syncJobs = createSyncJobRepositoryMock(null);
    const useCase = createUseCase(syncJobs);

    await useCase.execute({
      kind: 'completed',
      syncJobId: 'unknown',
      totalChunks: 5,
    });

    expect(syncJobs.save).not.toHaveBeenCalled();
  });
});

function createUseCase(syncJobs: SourceSyncJobRepositoryMock) {
  return new ApplyIngestionUpdateUseCase(
    syncJobs as unknown as SourceSyncJobRepository,
  );
}

function createSyncJobRepositoryMock(
  syncJob: Awaited<ReturnType<SourceSyncJobRepository['find']>>,
): SourceSyncJobRepositoryMock {
  return {
    find: vi.fn<SourceSyncJobRepository['find']>().mockResolvedValue(syncJob),
    save: vi
      .fn<SourceSyncJobRepository['save']>()
      .mockImplementation((job) => Promise.resolve(job)),
  };
}
