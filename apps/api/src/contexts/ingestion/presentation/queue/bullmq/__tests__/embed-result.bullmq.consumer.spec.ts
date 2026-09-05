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

function buildJob(
  data: Partial<EmbedResultPayload> = {},
): Job<EmbedResultPayload> {
  return {
    id: 'job-1',
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
      const consumer = new EmbedResultBullMqConsumer(useCase);
      const job = buildJob();

      await consumer.process(job);

      expect(execute).toHaveBeenCalledWith(job.data);
    });
  });

  describe('onFailed', () => {
    it('job이 있으면 job data와 error, job context로 useCase.handleFailure를 호출한다', () => {
      const { useCase, handleFailure } = buildMockUseCase();
      const consumer = new EmbedResultBullMqConsumer(useCase);
      const job = buildJob();
      const error = new Error('save failed');

      consumer.onFailed(job, error);

      expect(handleFailure).toHaveBeenCalledWith(job.data, error, {
        jobId: 'job-1',
        attemptsMade: 2,
      });
    });

    it('job이 undefined이면 아무것도 하지 않는다', () => {
      const { useCase, handleFailure } = buildMockUseCase();
      const consumer = new EmbedResultBullMqConsumer(useCase);

      consumer.onFailed(undefined, new Error('irrelevant'));

      expect(handleFailure).not.toHaveBeenCalled();
    });
  });
});
