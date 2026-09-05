import { describe, expect, it, vi } from 'vitest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IngestionFailedDomainEvent,
  IngestionProgressDomainEvent,
  IngestionStartedDomainEvent,
} from '@contexts/ingestion/domain';
import {
  RecursiveCharacterChunker,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_SEPARATORS,
} from '@contexts/ingestion/application/services/recursive-character.chunker';
import {
  type EmbedRequestPayload,
  type EmbedResultDispatcher,
  type EmbedResultPayload,
} from '@contexts/ingestion/application/ports';
import { EmbedSourceContentUseCase } from '../embed-source-content.use-case';

function buildMockEmbedder(embed = vi.fn()) {
  return { embed };
}

function buildMockDispatcher(enqueue = vi.fn().mockResolvedValue(undefined)) {
  return { enqueue } satisfies EmbedResultDispatcher;
}

function buildPayload(
  data: Partial<EmbedRequestPayload> = {},
): EmbedRequestPayload {
  return {
    sourceId: data.sourceId ?? 'source-1',
    syncJobId: data.syncJobId ?? 'sync-job-1',
    content: data.content ?? '# Source note',
  };
}

const fakeEmbedding = Array.from({ length: 1024 }, () => 0.1);
const fakeModel = 'qwen3-embedding:0.6b';
const chunker = new RecursiveCharacterChunker({
  chunkSize: DEFAULT_CHUNK_SIZE,
  chunkOverlap: DEFAULT_CHUNK_OVERLAP,
  separators: DEFAULT_SEPARATORS,
});

describe('EmbedSourceContentUseCase', () => {
  describe('execute', () => {
    it('content를 청킹하고 청크별로 임베딩한 뒤 embed-results dispatcher에 결과를 넘긴다', async () => {
      const embed = vi
        .fn()
        .mockResolvedValue({ embedding: fakeEmbedding, model: fakeModel });
      const enqueue = vi.fn().mockResolvedValue(undefined);
      const useCase = new EmbedSourceContentUseCase(
        buildMockEmbedder(embed),
        buildMockDispatcher(enqueue),
        new EventEmitter2(),
        chunker,
      );

      await useCase.execute(buildPayload({ content: '# Source note' }));

      expect(embed).toHaveBeenCalledOnce();
      expect(embed).toHaveBeenCalledWith('# Source note');
      expect(enqueue).toHaveBeenCalledWith(
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
      const enqueue = vi.fn().mockResolvedValue(undefined);
      // chunkSize=7: 'abc\n\ndef\n\nghi'는 단락별로 3개 청크로 분리됨
      const smallChunker = new RecursiveCharacterChunker({
        chunkSize: 7,
        chunkOverlap: 0,
        separators: DEFAULT_SEPARATORS,
      });
      const useCase = new EmbedSourceContentUseCase(
        buildMockEmbedder(embed),
        buildMockDispatcher(enqueue),
        new EventEmitter2(),
        smallChunker,
      );

      await useCase.execute(buildPayload({ content: 'abc\n\ndef\n\nghi' }));

      expect(embed).toHaveBeenCalledTimes(3);
      const payload = enqueue.mock.calls[0][0] as EmbedResultPayload;
      expect(payload.chunks).toHaveLength(3);
      expect(payload.chunks[0].chunkIndex).toBe(0);
    });

    it('시작 시 ingestion-started 이벤트를 totalChunks와 함께 emit한다', async () => {
      const embed = vi
        .fn()
        .mockResolvedValue({ embedding: fakeEmbedding, model: fakeModel });
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const smallChunker = new RecursiveCharacterChunker({
        chunkSize: 7,
        chunkOverlap: 0,
        separators: DEFAULT_SEPARATORS,
      });
      const useCase = new EmbedSourceContentUseCase(
        buildMockEmbedder(embed),
        buildMockDispatcher(),
        eventEmitter,
        smallChunker,
      );

      await useCase.execute(buildPayload({ content: 'abc\n\ndef\n\nghi' }));

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
      const smallChunker = new RecursiveCharacterChunker({
        chunkSize: 7,
        chunkOverlap: 0,
        separators: DEFAULT_SEPARATORS,
      });
      const useCase = new EmbedSourceContentUseCase(
        buildMockEmbedder(embed),
        buildMockDispatcher(),
        eventEmitter,
        smallChunker,
      );

      await useCase.execute(buildPayload({ content: 'abc\n\ndef\n\nghi' }));

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

  describe('handleFailure', () => {
    it('ingestion-failed 이벤트를 emit한다', () => {
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const useCase = new EmbedSourceContentUseCase(
        buildMockEmbedder(),
        buildMockDispatcher(),
        eventEmitter,
        chunker,
      );

      useCase.handleFailure(buildPayload({ syncJobId: 'sync-job-1' }));

      expect(emit).toHaveBeenCalledOnce();
      expect(emit).toHaveBeenCalledWith(
        'source.ingestion.failed',
        expect.any(IngestionFailedDomainEvent),
      );
    });

    it('emit된 failed 이벤트에 syncJobId가 담긴다', () => {
      const eventEmitter = new EventEmitter2();
      const emit = vi.spyOn(eventEmitter, 'emit');
      const useCase = new EmbedSourceContentUseCase(
        buildMockEmbedder(),
        buildMockDispatcher(),
        eventEmitter,
        chunker,
      );

      useCase.handleFailure(buildPayload({ syncJobId: 'sync-job-42' }));

      const event = emit.mock.calls[0][1] as IngestionFailedDomainEvent;
      expect(event.syncJobId).toBe('sync-job-42');
    });
  });
});
