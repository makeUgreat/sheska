import { describe, expect, it, vi } from 'vitest';
import { type Job } from 'bullmq';
import {
  type FinalizeEmbeddingWorkflowCommand,
  type FinalizeEmbeddingWorkflowUseCase,
} from '@contexts/ingestion/application/use-cases/finalize-embedding-workflow.use-case';
import { SourceEmbeddingFinalizationBullMqConsumer } from '../source-embedding-finalization.bullmq.consumer';

function buildJob(): Job<FinalizeEmbeddingWorkflowCommand> {
  return {
    id: 'parent-1',
    queueName: 'source-embedding-finalization',
    attemptsMade: 1,
    opts: {},
    data: {
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      totalChunks: 1,
    },
    getChildrenValues: vi.fn().mockResolvedValue({
      'bull:source-embedding-chunk:child-1': {
        kind: 'chunk',
        chunkIndex: 0,
        chunkContent: 'chunk',
        model: 'model',
        embedding: [0.1],
      },
    }),
  } as unknown as Job<FinalizeEmbeddingWorkflowCommand>;
}

function buildDependencies() {
  const execute = vi.fn().mockResolvedValue(undefined);
  const handleFailure = vi.fn().mockResolvedValue(undefined);
  const logger = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
  const useCase = {
    execute,
    handleFailure,
  } as unknown as FinalizeEmbeddingWorkflowUseCase;
  return { useCase, execute, handleFailure, logger };
}

describe('SourceEmbeddingFinalizationBullMqConsumer', () => {
  it('child 결과를 모아 저장 use case에 전달한다', async () => {
    const { useCase, execute, logger } = buildDependencies();
    const consumer = new SourceEmbeddingFinalizationBullMqConsumer(
      useCase,
      logger,
    );
    const job = buildJob();

    await consumer.process(job);

    expect(execute).toHaveBeenCalledWith(job.data, [
      expect.objectContaining({ chunkIndex: 0, chunkContent: 'chunk' }),
    ]);
  });

  it('finalize 실패를 기록하고 sync job 실패 처리한다', async () => {
    const { useCase, handleFailure, logger } = buildDependencies();
    const consumer = new SourceEmbeddingFinalizationBullMqConsumer(
      useCase,
      logger,
    );
    const job = buildJob();

    await consumer.onFailed(job, new Error('save failed'));

    expect(logger.error).toHaveBeenCalledOnce();
    expect(handleFailure).toHaveBeenCalledWith(job.data);
  });

  it('job payload를 쓸 수 없으면 보상을 건너뛰되 reject하지 않는다', async () => {
    const { useCase, handleFailure, logger } = buildDependencies();
    const consumer = new SourceEmbeddingFinalizationBullMqConsumer(
      useCase,
      logger,
    );
    const job = buildJob();
    (job as { data: unknown }).data = { sourceId: 'source-1' };

    await expect(
      consumer.onFailed(job, new Error('save failed')),
    ).resolves.toBeUndefined();

    expect(handleFailure).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'source-embedding-finalization job failure compensation skipped',
      expect.anything(),
      expect.anything(),
    );
  });

  it('보상 자체가 실패해도 reject하지 않고 error로 남긴다', async () => {
    const { useCase, handleFailure, logger } = buildDependencies();
    handleFailure.mockRejectedValue(new Error('outbox unavailable'));
    const consumer = new SourceEmbeddingFinalizationBullMqConsumer(
      useCase,
      logger,
    );
    const job = buildJob();

    await expect(
      consumer.onFailed(job, new Error('save failed')),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'source-embedding-finalization job failure compensation failed',
      expect.any(Error) as Error,
      expect.anything(),
    );
  });
  it('worker 내부 error를 기록하고 throw하지 않는다', () => {
    const { useCase, logger } = buildDependencies();
    const consumer = new SourceEmbeddingFinalizationBullMqConsumer(
      useCase,
      logger,
    );

    expect(() =>
      consumer.onError(new Error('redis connection lost')),
    ).not.toThrow();

    expect(logger.error).toHaveBeenCalledWith(
      'source-embedding-finalization worker error',
      expect.any(Error) as Error,
      { queueName: 'source-embedding-finalization' },
    );
  });
});
