import { describe, expect, it, vi } from 'vitest';
import { type Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IngestionCompletedDomainEvent,
  IngestionFailedDomainEvent,
  SourceEmbedding,
} from '@contexts/ingestion/domain';
import { VALID_EMBEDDING } from '../../../../../../test/support/domains/fixtures/source-embedding.fixture';
import {
  EmbedResultConsumer,
  type EmbedResultPayload,
} from '../embed-result.consumer';

function buildMockLogger() {
  return { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
}

function buildJob(
  data: Partial<EmbedResultPayload> = {},
): Job<EmbedResultPayload> {
  return {
    data: {
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
    },
  } as Job<EmbedResultPayload>;
}

describe('EmbedResultConsumer', () => {
  describe('process', () => {
    it('embedding 결과를 저장하고 ingestion-completed 이벤트를 emit한다', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const consumer = new EmbedResultConsumer(
        { save, find: vi.fn() },
        eventEmitter,
        buildMockLogger(),
      );

      await consumer.process(buildJob());

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
      const consumer = new EmbedResultConsumer(
        { save: vi.fn().mockResolvedValue(undefined), find: vi.fn() },
        eventEmitter,
        buildMockLogger(),
      );

      await consumer.process(buildJob({ syncJobId: 'sync-job-42' }));

      const event = emit.mock.calls[0][1] as IngestionCompletedDomainEvent;
      expect(event.syncJobId).toBe('sync-job-42');
    });

    it('복수 청크가 담긴 payload로 SourceEmbedding을 저장한다', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const consumer = new EmbedResultConsumer(
        { save, find: vi.fn() },
        new EventEmitter2(),
        buildMockLogger(),
      );

      await consumer.process(
        buildJob({
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

  describe('onFailed', () => {
    it('job이 있으면 ingestion-failed 이벤트를 emit한다', () => {
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const consumer = new EmbedResultConsumer(
        { save: vi.fn(), find: vi.fn() },
        eventEmitter,
        buildMockLogger(),
      );

      consumer.onFailed(
        buildJob({ syncJobId: 'sync-job-1' }),
        new Error('save failed'),
      );

      expect(emit).toHaveBeenCalledOnce();
      expect(emit).toHaveBeenCalledWith(
        'source.ingestion.failed',
        expect.any(IngestionFailedDomainEvent),
      );
    });

    it('job이 undefined이면 아무것도 하지 않는다', () => {
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const consumer = new EmbedResultConsumer(
        { save: vi.fn(), find: vi.fn() },
        eventEmitter,
        buildMockLogger(),
      );

      consumer.onFailed(undefined, new Error('irrelevant'));

      expect(emit).not.toHaveBeenCalled();
    });

    it('실패 원인 Error와 job context를 로그에 기록한다', () => {
      const logger = buildMockLogger();
      const consumer = new EmbedResultConsumer(
        { save: vi.fn(), find: vi.fn() },
        new EventEmitter2(),
        logger,
      );
      const error = new Error('save failed');

      consumer.onFailed(buildJob(), error);

      expect(logger.error).toHaveBeenCalledWith(
        'Embed result failed',
        error,
        expect.objectContaining({
          jobId: undefined,
          sourceId: 'source-1',
          syncJobId: 'sync-job-1',
          attemptsMade: undefined,
        }),
      );
    });
  });
});
