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
});
