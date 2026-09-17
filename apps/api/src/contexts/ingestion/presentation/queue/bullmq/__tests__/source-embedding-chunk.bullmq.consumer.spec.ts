import { describe, expect, it, vi } from 'vitest';
import { type Job } from 'bullmq';
import {
  EMBED_SOURCE_CHUNK_CALL_POLICY,
  type EmbedSourceChunkCommand,
  type EmbedSourceChunkUseCase,
} from '@contexts/ingestion/application/use-cases/embed-source-chunk.use-case';
import { SourceEmbeddingChunkBullMqConsumer } from '../source-embedding-chunk.bullmq.consumer';

function buildJob(
  updateProgress = vi.fn().mockResolvedValue(undefined),
): Job<EmbedSourceChunkCommand> {
  return {
    id: 'job-1',
    queueName: 'source-embedding-chunk',
    attemptsMade: 1,
    updateProgress,
    data: {
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      chunkIndex: 0,
      chunkContent: 'chunk',
    },
  } as unknown as Job<EmbedSourceChunkCommand>;
}

function buildDependencies() {
  const execute = vi.fn().mockResolvedValue({
    kind: 'chunk',
    chunkIndex: 0,
    chunkContent: 'chunk',
    model: 'model',
    embedding: [0.1],
  });
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
  } as unknown as EmbedSourceChunkUseCase;
  return { useCase, execute, handleFailure, logger };
}

describe('SourceEmbeddingChunkBullMqConsumer', () => {
  it('chunk를 처리한다', async () => {
    const { useCase, execute, logger } = buildDependencies();
    const consumer = new SourceEmbeddingChunkBullMqConsumer(useCase, logger);
    const updateProgress = vi.fn().mockResolvedValue(undefined);
    const job = buildJob(updateProgress);

    await consumer.process(job);

    expect(execute).toHaveBeenCalledWith(job.data, {
      deadline: expect.objectContaining({
        deadlineAt: expect.any(Number) as number,
      }) as { deadlineAt: number },
      attemptTimeoutMs: EMBED_SOURCE_CHUNK_CALL_POLICY.attemptTimeoutMs,
    });
    expect(updateProgress).toHaveBeenCalledWith(100);
  });

  it('실패를 기록하고 sync job을 실패 처리한다', async () => {
    const { useCase, handleFailure, logger } = buildDependencies();
    const consumer = new SourceEmbeddingChunkBullMqConsumer(useCase, logger);
    const job = buildJob();

    await consumer.onFailed(job, new Error('terminal'));

    expect(logger.error).toHaveBeenCalledOnce();
    expect(handleFailure).toHaveBeenCalledWith(job.data);
  });
});
