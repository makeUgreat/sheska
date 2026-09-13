import { describe, expect, it, vi } from 'vitest';
import { type IntegrationEventDispatcher } from '@kernels/application';
import { SourceEmbedding } from '@contexts/ingestion/domain';
import {
  type IngestionCompletedIntegrationEvent,
  type IngestionFailedIntegrationEvent,
} from '@contexts/ingestion/application/events/ingestion.integration-event';
import { type EmbedResultPayload } from '@contexts/ingestion/application/ports';
import { VALID_EMBEDDING } from '../../../../../../test/support/domains/fixtures/source-embedding.fixture';
import { SaveEmbeddingResultUseCase } from '../save-embedding-result.use-case';

function buildMockIntegrationEventDispatcher(
  dispatch = vi
    .fn<IntegrationEventDispatcher['dispatch']>()
    .mockResolvedValue(undefined),
) {
  return { dispatch } satisfies IntegrationEventDispatcher;
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
    it('embedding 결과를 저장하고 ingestion-completed 이벤트를 dispatch한다', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const dispatch = vi
        .fn<IntegrationEventDispatcher['dispatch']>()
        .mockResolvedValue(undefined);
      const useCase = new SaveEmbeddingResultUseCase(
        { save, find: vi.fn() },
        buildMockIntegrationEventDispatcher(dispatch),
      );

      await useCase.execute(buildPayload());

      expect(save).toHaveBeenCalledOnce();
      expect(dispatch).toHaveBeenCalledOnce();
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'source.ingestion.completed',
          eventVersion: 1,
        }),
      );
    });

    it('dispatch된 completed 이벤트에 syncJobId가 담긴다', async () => {
      const dispatch = vi
        .fn<IntegrationEventDispatcher['dispatch']>()
        .mockResolvedValue(undefined);
      const useCase = new SaveEmbeddingResultUseCase(
        { save: vi.fn().mockResolvedValue(undefined), find: vi.fn() },
        buildMockIntegrationEventDispatcher(dispatch),
      );

      await useCase.execute(buildPayload({ syncJobId: 'sync-job-42' }));

      const event = dispatch.mock
        .calls[0][0] as IngestionCompletedIntegrationEvent;
      expect(event.payload.syncJobId).toBe('sync-job-42');
    });

    it('복수 청크가 담긴 payload로 SourceEmbedding을 저장한다', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const useCase = new SaveEmbeddingResultUseCase(
        { save, find: vi.fn() },
        buildMockIntegrationEventDispatcher(),
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
    it('ingestion-failed 이벤트를 dispatch한다', async () => {
      const dispatch = vi
        .fn<IntegrationEventDispatcher['dispatch']>()
        .mockResolvedValue(undefined);
      const useCase = new SaveEmbeddingResultUseCase(
        { save: vi.fn(), find: vi.fn() },
        buildMockIntegrationEventDispatcher(dispatch),
      );

      await useCase.handleFailure(buildPayload({ syncJobId: 'sync-job-1' }));

      expect(dispatch).toHaveBeenCalledOnce();
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'source.ingestion.failed',
          eventVersion: 1,
        }),
      );
    });

    it('dispatch된 failed 이벤트에 syncJobId가 담긴다', async () => {
      const dispatch = vi
        .fn<IntegrationEventDispatcher['dispatch']>()
        .mockResolvedValue(undefined);
      const useCase = new SaveEmbeddingResultUseCase(
        { save: vi.fn(), find: vi.fn() },
        buildMockIntegrationEventDispatcher(dispatch),
      );

      await useCase.handleFailure(buildPayload({ syncJobId: 'sync-job-42' }));

      const event = dispatch.mock
        .calls[0][0] as IngestionFailedIntegrationEvent;
      expect(event.payload.syncJobId).toBe('sync-job-42');
    });
  });
});
