import { describe, expect, it, vi } from 'vitest';
import { computeDeadline } from '@core/deadline';
import { type IntegrationEventDispatcher } from '@kernels/application';
import { EmbedSourceChunkUseCase } from '../embed-source-chunk.use-case';

describe('EmbedSourceChunkUseCase', () => {
  it('하나의 chunk를 embedding하고 job result를 반환한다', async () => {
    const embed = vi.fn().mockResolvedValue({
      model: 'qwen3-embedding:0.6b',
      embedding: [0.1, 0.2],
    });
    const useCase = new EmbedSourceChunkUseCase(
      { embed },
      { dispatch: vi.fn() },
    );
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

  it('최종 실패를 sync job 실패 이벤트로 변환한다', async () => {
    const dispatch = vi
      .fn<IntegrationEventDispatcher['dispatch']>()
      .mockResolvedValue(undefined);
    const useCase = new EmbedSourceChunkUseCase(
      { embed: vi.fn() },
      { dispatch },
    );

    await useCase.handleFailure({
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      chunkIndex: 0,
      chunkContent: 'chunk',
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'source.ingestion.failed',
        payload: { syncJobId: 'sync-job-1' },
      }),
    );
  });
});
