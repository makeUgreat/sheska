import { describe, expect, it, vi } from 'vitest';
import { type Job } from 'bullmq';
import {
  type EmbedSourceChunkCommand,
  type EmbedSourceChunkUseCase,
} from '@contexts/ingestion/application/use-cases/embed-source-chunk.use-case';
import { SourceEmbeddingChunkBullMqConsumer } from '../source-embedding-chunk.bullmq.consumer';

function buildJob(
  updateProgress = vi.fn().mockResolvedValue(undefined),
  attempts: { attemptsMade: number; maxAttempts?: number } = {
    attemptsMade: 1,
  },
): Job<EmbedSourceChunkCommand> {
  return {
    id: 'job-1',
    queueName: 'source-embedding-chunk',
    attemptsMade: attempts.attemptsMade,
    opts: { attempts: attempts.maxAttempts },
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
      maxRetries: 0,
    });
    expect(updateProgress).toHaveBeenCalledWith(100);
  });

  it('시도가 남아 있으면 sync job을 실패 처리하지 않는다', async () => {
    const { useCase, handleFailure, logger } = buildDependencies();
    const consumer = new SourceEmbeddingChunkBullMqConsumer(useCase, logger);
    const job = buildJob(undefined, { attemptsMade: 1, maxAttempts: 3 });

    await consumer.onFailed(job, new Error('transient'));

    expect(handleFailure).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('시도를 모두 소진하면 실패를 기록하고 sync job을 실패 처리한다', async () => {
    const { useCase, handleFailure, logger } = buildDependencies();
    const consumer = new SourceEmbeddingChunkBullMqConsumer(useCase, logger);
    const job = buildJob(undefined, { attemptsMade: 3, maxAttempts: 3 });

    await consumer.onFailed(job, new Error('terminal'));

    expect(logger.error).toHaveBeenCalledOnce();
    expect(handleFailure).toHaveBeenCalledWith(job.data);
  });

  it('job payload를 쓸 수 없으면 보상을 건너뛰되 reject하지 않는다', async () => {
    const { useCase, handleFailure, logger } = buildDependencies();
    const consumer = new SourceEmbeddingChunkBullMqConsumer(useCase, logger);
    const job = buildJob(undefined, { attemptsMade: 3, maxAttempts: 3 });
    (job as { data: unknown }).data = { sourceId: 'source-1' };

    await expect(
      consumer.onFailed(job, new Error('terminal')),
    ).resolves.toBeUndefined();

    expect(handleFailure).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'source-embedding-chunk job failure compensation skipped',
      expect.anything(),
      expect.anything(),
    );
  });

  it('보상 자체가 실패해도 reject하지 않고 error로 남긴다', async () => {
    const { useCase, handleFailure, logger } = buildDependencies();
    handleFailure.mockRejectedValue(new Error('outbox unavailable'));
    const consumer = new SourceEmbeddingChunkBullMqConsumer(useCase, logger);
    const job = buildJob(undefined, { attemptsMade: 3, maxAttempts: 3 });

    await expect(
      consumer.onFailed(job, new Error('terminal')),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'source-embedding-chunk job failure compensation failed',
      expect.any(Error) as Error,
      expect.anything(),
    );
  });

  it('job에 attempts가 없으면 1회 시도로 보고 곧바로 실패 처리한다', async () => {
    const { useCase, handleFailure, logger } = buildDependencies();
    const consumer = new SourceEmbeddingChunkBullMqConsumer(useCase, logger);
    const job = buildJob(undefined, { attemptsMade: 1 });

    await consumer.onFailed(job, new Error('terminal'));

    expect(logger.error).toHaveBeenCalledOnce();
    expect(handleFailure).toHaveBeenCalledWith(job.data);
  });
  it('worker 내부 error를 기록하고 throw하지 않는다', () => {
    const { useCase, logger } = buildDependencies();
    const consumer = new SourceEmbeddingChunkBullMqConsumer(useCase, logger);

    expect(() =>
      consumer.onError(new Error('redis connection lost')),
    ).not.toThrow();

    expect(logger.error).toHaveBeenCalledWith(
      'source-embedding-chunk worker error',
      expect.any(Error) as Error,
      { queueName: 'source-embedding-chunk' },
    );
  });
});
