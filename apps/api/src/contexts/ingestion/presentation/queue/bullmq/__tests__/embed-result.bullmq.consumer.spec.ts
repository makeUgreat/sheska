import { describe, expect, it, vi } from 'vitest';
import { type Job } from 'bullmq';
import { type EmbedResultPayload } from '@contexts/ingestion/application/ports';
import { type SaveEmbeddingResultUseCase } from '@contexts/ingestion/application/use-cases/save-embedding-result.use-case';
import { EmbedResultBullMqConsumer } from '../embed-result.bullmq.consumer';

function buildMockUseCase() {
  const execute = vi.fn().mockResolvedValue(undefined);
  const handleFailure = vi.fn();
  const useCase = {
    execute,
    handleFailure,
  } as unknown as SaveEmbeddingResultUseCase;
  return { useCase, execute, handleFailure };
}

function buildMockLogger() {
  return { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
}

function buildJob(
  data: Partial<EmbedResultPayload> = {},
): Job<EmbedResultPayload> {
  return {
    id: 'job-1',
    queueName: 'embed-results',
    attemptsMade: 2,
    data: {
      sourceId: data.sourceId ?? 'source-1',
      syncJobId: data.syncJobId ?? 'sync-job-1',
      model: data.model ?? 'qwen3-embedding:0.6b',
      chunks: data.chunks ?? [],
    },
  } as Job<EmbedResultPayload>;
}

describe('EmbedResultBullMqConsumer', () => {
  describe('process', () => {
    it('job.data로 useCase.execute를 호출한다', async () => {
      const { useCase, execute } = buildMockUseCase();
      const consumer = new EmbedResultBullMqConsumer(
        useCase,
        buildMockLogger(),
      );
      const job = buildJob();

      await consumer.process(job);

      expect(execute).toHaveBeenCalledWith(job.data);
    });
  });

  describe('onFailed', () => {
    it('job이 있으면 큐 이름, jobId, attemptsMade를 로그에 기록한다', () => {
      const { useCase } = buildMockUseCase();
      const logger = buildMockLogger();
      const consumer = new EmbedResultBullMqConsumer(useCase, logger);
      const job = buildJob();
      const error = new Error('save failed');

      consumer.onFailed(job, error);

      expect(logger.error).toHaveBeenCalledWith(
        'embed-results job failed',
        error,
        {
          queueName: 'embed-results',
          jobId: 'job-1',
          attemptsMade: 2,
        },
      );
    });

    it('job이 있으면 job data로 useCase.handleFailure를 호출한다', () => {
      const { useCase, handleFailure } = buildMockUseCase();
      const consumer = new EmbedResultBullMqConsumer(
        useCase,
        buildMockLogger(),
      );
      const job = buildJob();

      consumer.onFailed(job, new Error('save failed'));

      expect(handleFailure).toHaveBeenCalledWith(job.data);
    });

    it('job이 undefined이면 아무것도 하지 않는다', () => {
      const { useCase, handleFailure } = buildMockUseCase();
      const logger = buildMockLogger();
      const consumer = new EmbedResultBullMqConsumer(useCase, logger);

      consumer.onFailed(undefined, new Error('irrelevant'));

      expect(logger.error).not.toHaveBeenCalled();
      expect(handleFailure).not.toHaveBeenCalled();
    });
  });
});
