import { describe, expect, it, vi } from 'vitest';
import { computeDeadline } from '@core/deadline';
import { type OutboxWriter } from '@kernels/application';
import { type IngestionUnitOfWork } from '@contexts/ingestion/application/ports';
import { EmbedSourceChunkUseCase } from '../embed-source-chunk.use-case';

function buildUnitOfWork(append: OutboxWriter['append'] = vi.fn()): IngestionUnitOfWork {
  return {
    execute: (work) => work({ sourceEmbeddings: { upsert: vi.fn(), find: vi.fn() }, outbox: { append } }),
  };
}

describe('EmbedSourceChunkUseCase', () => {
  it('하나의 chunk를 embedding하고 job result를 반환한다', async () => {
    const embed = vi.fn().mockResolvedValue({
      model: 'qwen3-embedding:0.6b',
      embedding: [0.1, 0.2],
    });
    const useCase = new EmbedSourceChunkUseCase({ embed }, buildUnitOfWork());
    const context = {
      deadline: computeDeadline(1_000),
      maxRetries: 2,
    };

    await expect(
      useCase.execute(
        {
          sourceId: 'source-1',
          syncJobId: 'sync-job-1',
          chunkIndex: 2,
          chunkContent: 'chunk',
        },
        context,
      ),
    ).resolves.toEqual({
      kind: 'chunk',
      chunkIndex: 2,
      chunkContent: 'chunk',
      model: 'qwen3-embedding:0.6b',
      embedding: [0.1, 0.2],
    });
    expect(embed).toHaveBeenCalledWith('chunk', context);
  });

  it('최종 실패를 sync job 실패 이벤트로 outbox에 기록한다', async () => {
    const append = vi.fn<OutboxWriter['append']>().mockResolvedValue(undefined);
    const useCase = new EmbedSourceChunkUseCase({ embed: vi.fn() }, buildUnitOfWork(append));

    await useCase.handleFailure({
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      chunkIndex: 0,
      chunkContent: 'chunk',
    });

    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'source.ingestion.failed',
        payload: { syncJobId: 'sync-job-1' },
      }),
    );
  });
});
