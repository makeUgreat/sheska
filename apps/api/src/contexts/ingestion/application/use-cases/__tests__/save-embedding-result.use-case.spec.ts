import { describe, expect, it, vi } from 'vitest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IngestionCompletedDomainEvent,
  IngestionFailedDomainEvent,
  SourceEmbedding,
} from '@contexts/ingestion/domain';
import { type EmbedResultPayload } from '@contexts/ingestion/application/ports';
import { VALID_EMBEDDING } from '../../../../../../test/support/domains/fixtures/source-embedding.fixture';
import { SaveEmbeddingResultUseCase } from '../save-embedding-result.use-case';

function buildMockLogger() {
  return { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
}

function buildPayload(
  data: Partial<EmbedResultPayload> = {},
): EmbedResultPayload {
  return {
    sourceId: data.sourceId ?? 'source-1',
    syncJobId: data.syncJobId ?? 'sync-job-1',
    model: data.model ?? 'qwen3-embedding:0.6b',
    chunks: data.chunks ?? [
      {
        chunkIndex: 0,
        chunkContent: 'chunk content',
        embedding: VALID_EMBEDDING,
      },
    ],
  };
}

describe('SaveEmbeddingResultUseCase', () => {
  describe('execute', () => {
    it('embedding 결과를 저장하고 ingestion-completed 이벤트를 emit한다', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const useCase = new SaveEmbeddingResultUseCase(
        { save, find: vi.fn() },
        eventEmitter,
        buildMockLogger(),
      );

      await useCase.execute(buildPayload());

      expect(save).toHaveBeenCalledOnce();
      expect(emit).toHaveBeenCalledOnce();
      expect(emit).toHaveBeenCalledWith(
        'source.ingestion.completed',
        expect.any(IngestionCompletedDomainEvent),
      );
    });

    it('emit된 completed 이벤트에 syncJobId가 담긴다', async () => {
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const useCase = new SaveEmbeddingResultUseCase(
        { save: vi.fn().mockResolvedValue(undefined), find: vi.fn() },
        eventEmitter,
        buildMockLogger(),
      );

      await useCase.execute(buildPayload({ syncJobId: 'sync-job-42' }));

      const event = emit.mock.calls[0][1] as IngestionCompletedDomainEvent;
      expect(event.syncJobId).toBe('sync-job-42');
    });

    it('복수 청크가 담긴 payload로 SourceEmbedding을 저장한다', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const useCase = new SaveEmbeddingResultUseCase(
        { save, find: vi.fn() },
        new EventEmitter2(),
        buildMockLogger(),
      );

      await useCase.execute(
        buildPayload({
          chunks: [
            {
              chunkIndex: 0,
              chunkContent: 'first',
              embedding: VALID_EMBEDDING,
            },
            {
              chunkIndex: 1,
              chunkContent: 'second',
              embedding: VALID_EMBEDDING,
            },
          ],
        }),
      );

      expect(save).toHaveBeenCalledOnce();
      const savedEmbedding = save.mock.calls[0][0] as SourceEmbedding;
      expect(savedEmbedding.getProps().chunks).toHaveLength(2);
    });
  });

  describe('handleFailure', () => {
    it('ingestion-failed 이벤트를 emit한다', () => {
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const useCase = new SaveEmbeddingResultUseCase(
        { save: vi.fn(), find: vi.fn() },
        eventEmitter,
        buildMockLogger(),
      );

      useCase.handleFailure(
        buildPayload({ syncJobId: 'sync-job-1' }),
        new Error('save failed'),
        { jobId: undefined, attemptsMade: 0 },
      );

      expect(emit).toHaveBeenCalledOnce();
      expect(emit).toHaveBeenCalledWith(
        'source.ingestion.failed',
        expect.any(IngestionFailedDomainEvent),
      );
    });

    it('실패 원인 Error와 job context를 로그에 기록한다', () => {
      const logger = buildMockLogger();
      const useCase = new SaveEmbeddingResultUseCase(
        { save: vi.fn(), find: vi.fn() },
        new EventEmitter2(),
        logger,
      );
      const error = new Error('save failed');

      useCase.handleFailure(buildPayload(), error, {
        jobId: undefined,
        attemptsMade: 0,
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Embed result failed',
        error,
        expect.objectContaining({
          jobId: undefined,
          sourceId: 'source-1',
          syncJobId: 'sync-job-1',
          attemptsMade: 0,
        }),
      );
    });
  });
});
