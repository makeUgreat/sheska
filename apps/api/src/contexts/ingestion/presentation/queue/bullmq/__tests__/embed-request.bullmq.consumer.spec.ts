import { describe, expect, it, vi } from 'vitest';
import { type Job } from 'bullmq';
import { type EmbedRequestPayload } from '@contexts/ingestion/application/ports';
import { type EmbedSourceContentUseCase } from '@contexts/ingestion/application/use-cases/embed-source-content.use-case';
import { EmbedRequestBullMqConsumer } from '../embed-request.bullmq.consumer';

function buildMockUseCase() {
  const execute = vi.fn().mockResolvedValue(undefined);
  const handleFailure = vi.fn();
  const useCase = {
    execute,
    handleFailure,
  } as unknown as EmbedSourceContentUseCase;
  return { useCase, execute, handleFailure };
}

function buildMockLogger() {
  return { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
}

function buildJob(
  data: Partial<EmbedRequestPayload> = {},
): Job<EmbedRequestPayload> {
  return {
    id: 'job-1',
    queueName: 'embed-requests',
    attemptsMade: 2,
    data: {
      sourceId: data.sourceId ?? 'source-1',
      syncJobId: data.syncJobId ?? 'sync-job-1',
      content: data.content ?? '# Source note',
    },
  } as Job<EmbedRequestPayload>;
}

describe('EmbedRequestBullMqConsumer', () => {
  describe('process', () => {
    it('job.data로 useCase.execute를 호출한다', async () => {
      const { useCase, execute } = buildMockUseCase();
      const consumer = new EmbedRequestBullMqConsumer(
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
      const consumer = new EmbedRequestBullMqConsumer(useCase, logger);
      const job = buildJob();
      const error = new Error('embed failed');

      consumer.onFailed(job, error);

      expect(logger.error).toHaveBeenCalledWith(
        'embed-requests job failed',
        error,
        {
          queueName: 'embed-requests',
          jobId: 'job-1',
          attemptsMade: 2,
        },
      );
    });

    it('job이 있으면 job data로 useCase.handleFailure를 호출한다', () => {
      const { useCase, handleFailure } = buildMockUseCase();
      const consumer = new EmbedRequestBullMqConsumer(
        useCase,
        buildMockLogger(),
      );
      const job = buildJob();

      consumer.onFailed(job, new Error('embed failed'));

      expect(handleFailure).toHaveBeenCalledWith(job.data);
    });

    it('job이 undefined이면 아무것도 하지 않는다', () => {
      const { useCase, handleFailure } = buildMockUseCase();
      const logger = buildMockLogger();
      const consumer = new EmbedRequestBullMqConsumer(useCase, logger);

      consumer.onFailed(undefined, new Error('irrelevant'));

      expect(logger.error).not.toHaveBeenCalled();
      expect(handleFailure).not.toHaveBeenCalled();
    });
  });
});
