import { describe, expect, it, vi } from 'vitest';
import { type Job, type Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IngestionFailedDomainEvent,
  IngestionProgressDomainEvent,
  IngestionStartedDomainEvent,
} from '@contexts/ingestion/domain';
import { RecursiveCharacterChunker } from '@contexts/ingestion/application/services/recursive-character.chunker';
import {
  EmbedRequestConsumer,
  type EmbedRequestPayload,
} from '../embed-request.consumer';
import { type EmbedResultPayload } from '../embed-result.consumer';

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

const fakeEmbedding = Array.from({ length: 1024 }, () => 0.1);
const fakeModel = 'qwen3-embedding:0.6b';
const chunker = new RecursiveCharacterChunker();

describe('EmbedRequestConsumer', () => {
  describe('process', () => {
    it('content를 청킹하고 청크별로 임베딩한 뒤 embed-results 큐에 결과를 추가한다', async () => {
      const embed = vi
        .fn()
        .mockResolvedValue({ embedding: fakeEmbedding, model: fakeModel });
      const add = vi.fn().mockResolvedValue(undefined);
      const consumer = new EmbedRequestConsumer(
        { embed },
        { add } as unknown as Queue,
        new EventEmitter2(),
        buildMockLogger(),
        chunker,
      );

      await consumer.process(buildJob({ content: '# Source note' }));

      expect(embed).toHaveBeenCalledOnce();
      expect(embed).toHaveBeenCalledWith('# Source note');
      expect(add).toHaveBeenCalledWith(
        'embed-result',
        expect.objectContaining<Partial<EmbedResultPayload>>({
          sourceId: 'source-1',
          syncJobId: 'sync-job-1',
          model: fakeModel,
        }),
      );
    });

    it('chunkSize를 초과하는 content는 복수 청크로 나뉘어 임베딩된다', async () => {
      const embed = vi
        .fn()
        .mockResolvedValue({ embedding: fakeEmbedding, model: fakeModel });
      const add = vi.fn().mockResolvedValue(undefined);
      // chunkSize=7: 'abc\n\ndef\n\nghi'는 단락별로 3개 청크로 분리됨
      const smallChunker = new RecursiveCharacterChunker(7, 0);
      const consumer = new EmbedRequestConsumer(
        { embed },
        { add } as unknown as Queue,
        new EventEmitter2(),
        buildMockLogger(),
        smallChunker,
      );

      await consumer.process(buildJob({ content: 'abc\n\ndef\n\nghi' }));

      expect(embed).toHaveBeenCalledTimes(3);
      const payload = (add.mock.calls[0] as [string, EmbedResultPayload])[1];
      expect(payload.chunks).toHaveLength(3);
      expect(payload.chunks[0].chunkIndex).toBe(0);
    });

    it('시작 시 ingestion-started 이벤트를 totalChunks와 함께 emit한다', async () => {
      const embed = vi
        .fn()
        .mockResolvedValue({ embedding: fakeEmbedding, model: fakeModel });
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const smallChunker = new RecursiveCharacterChunker(7, 0);
      const consumer = new EmbedRequestConsumer(
        { embed },
        { add: vi.fn() } as unknown as Queue,
        eventEmitter,
        buildMockLogger(),
        smallChunker,
      );

      await consumer.process(buildJob({ content: 'abc\n\ndef\n\nghi' }));

      expect(emit).toHaveBeenCalledWith(
        'source.ingestion.started',
        expect.objectContaining<Partial<IngestionStartedDomainEvent>>({
          syncJobId: 'sync-job-1',
          totalChunks: 3,
        }),
      );
    });

    it('청크마다 ingestion-progress 이벤트를 순서대로 emit한다', async () => {
      const embed = vi
        .fn()
        .mockResolvedValue({ embedding: fakeEmbedding, model: fakeModel });
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const smallChunker = new RecursiveCharacterChunker(7, 0);
      const consumer = new EmbedRequestConsumer(
        { embed },
        { add: vi.fn() } as unknown as Queue,
        eventEmitter,
        buildMockLogger(),
        smallChunker,
      );

      await consumer.process(buildJob({ content: 'abc\n\ndef\n\nghi' }));

      const progressCalls = emit.mock.calls.filter(
        ([eventName]) => eventName === 'source.ingestion.progress',
      );
      expect(progressCalls).toHaveLength(3);
      expect(
        progressCalls.map(
          ([, event]) =>
            (event as IngestionProgressDomainEvent).processedChunks,
        ),
      ).toEqual([1, 2, 3]);
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
        chunker,
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
        chunker,
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
        chunker,
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
        chunker,
      );

      consumer.onFailed(undefined, new Error('irrelevant'));

      expect(emit).not.toHaveBeenCalled();
    });
  });
});
