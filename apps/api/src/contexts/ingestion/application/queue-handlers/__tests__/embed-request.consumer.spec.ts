import { describe, expect, it, vi } from 'vitest';
import { type Job, type Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IngestionFailedDomainEvent } from '@contexts/ingestion/domain';
import {
  EmbedRequestConsumer,
  type EmbedRequestPayload,
} from '../embed-request.consumer';

function buildMockLogger() {
  return { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
}

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
        buildMockLogger(),
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
        buildMockLogger(),
      );

      consumer.onFailed(
        buildJob({ syncJobId: 'sync-job-1' }),
        new Error('embed failed'),
      );

      expect(emit).toHaveBeenCalledOnce();
      expect(emit).toHaveBeenCalledWith(
        'source.ingestion.failed',
        expect.any(IngestionFailedDomainEvent),
      );
    });

    it('에러 메시지를 로그에 기록한다', () => {
      const logger = buildMockLogger();
      const consumer = new EmbedRequestConsumer(
        { embed: vi.fn() },
        { add: vi.fn() } as unknown as Queue,
        new EventEmitter2(),
        logger,
      );

      consumer.onFailed(buildJob(), new Error('connection refused'));

      expect(logger.error).toHaveBeenCalledWith(
        'Embed request failed',
        expect.objectContaining({ error: 'connection refused' }),
      );
    });

    it('구조화된 exception이면 kind와 code를 로그에 기록한다', () => {
      const logger = buildMockLogger();
      const consumer = new EmbedRequestConsumer(
        { embed: vi.fn() },
        { add: vi.fn() } as unknown as Queue,
        new EventEmitter2(),
        logger,
      );
      const error = Object.assign(new Error('Ollama unavailable'), {
        kind: 'unavailable',
        code: 'ollama.request_failed',
        source: { boundary: 'http-client', adapter: 'ollama.embedder' },
      });

      consumer.onFailed(buildJob(), error);

      expect(logger.error).toHaveBeenCalledWith(
        'Embed request failed',
        expect.objectContaining({
          kind: 'unavailable',
          code: 'ollama.request_failed',
        }),
      );
    });

    it('job이 undefined이면 아무것도 하지 않는다', () => {
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const consumer = new EmbedRequestConsumer(
        { embed: vi.fn() },
        { add: vi.fn() } as unknown as Queue,
        eventEmitter,
        buildMockLogger(),
      );

      consumer.onFailed(undefined, new Error('irrelevant'));

      expect(emit).not.toHaveBeenCalled();
    });
  });
});
