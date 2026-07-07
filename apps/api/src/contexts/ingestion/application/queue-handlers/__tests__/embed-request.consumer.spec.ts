import { describe, expect, it, vi } from 'vitest';
import { type Job, type Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IngestionFailedDomainEvent } from '@contexts/ingestion/domain';
import {
  EmbedRequestConsumer,
  type EmbedRequestPayload,
} from '../embed-request.consumer';

function buildJob(
  data: Partial<EmbedRequestPayload> = {},
): Job<EmbedRequestPayload> {
  return {
    data: {
      sourceId: data.sourceId ?? 'source-1',
      syncJobId: data.syncJobId ?? 'sync-job-1',
      content: data.content ?? '# Source note',
    },
  } as Job<EmbedRequestPayload>;
}

describe('EmbedRequestConsumer', () => {
  describe('process', () => {
    it('content를 임베딩하고 embed-results 큐에 결과를 추가한다', async () => {
      const fakeEmbedding = [0.1, 0.2, 0.3];
      const fakeModel = 'qwen3-embedding:0.6b';
      const embed = vi
        .fn()
        .mockResolvedValue({ embedding: fakeEmbedding, model: fakeModel });
      const add = vi.fn().mockResolvedValue(undefined);
      const consumer = new EmbedRequestConsumer(
        { embed },
        { add } as unknown as Queue,
        new EventEmitter2(),
      );

      await consumer.process(buildJob());

      expect(embed).toHaveBeenCalledWith('# Source note');
      expect(add).toHaveBeenCalledWith('embed-result', {
        sourceId: 'source-1',
        syncJobId: 'sync-job-1',
        embedding: fakeEmbedding,
        model: fakeModel,
      });
    });
  });

  describe('onFailed', () => {
    it('job이 있으면 ingestion-failed 이벤트를 emit한다', () => {
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const consumer = new EmbedRequestConsumer(
        { embed: vi.fn() },
        { add: vi.fn() } as unknown as Queue,
        eventEmitter,
      );

      consumer.onFailed(buildJob({ syncJobId: 'sync-job-1' }));

      expect(emit).toHaveBeenCalledOnce();
      expect(emit).toHaveBeenCalledWith(
        'source.ingestion.failed',
        expect.any(IngestionFailedDomainEvent),
      );
    });

    it('job이 undefined이면 아무것도 하지 않는다', () => {
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const consumer = new EmbedRequestConsumer(
        { embed: vi.fn() },
        { add: vi.fn() } as unknown as Queue,
        eventEmitter,
      );

      consumer.onFailed(undefined);

      expect(emit).not.toHaveBeenCalled();
    });
  });
});
