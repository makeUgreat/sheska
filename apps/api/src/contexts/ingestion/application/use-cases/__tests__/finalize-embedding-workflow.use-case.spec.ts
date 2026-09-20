import { describe, expect, it, vi } from 'vitest';
import {
  APPLICATION_ERROR_KIND,
  type IntegrationEventDispatcher,
  type OutboxWriter,
} from '@kernels/application';
import { type IngestionUnitOfWork } from '@contexts/ingestion/application/ports';
import { SourceEmbedding } from '@contexts/ingestion/domain';
import { type EmbedSourceChunkResult } from '@contexts/ingestion/application/use-cases/embed-source-chunk.use-case';
import { VALID_EMBEDDING } from '../../../../../../test/support/domains/fixtures/source-embedding.fixture';
import {
  FinalizeEmbeddingWorkflowUseCase,
  type FinalizeEmbeddingWorkflowCommand,
} from '../finalize-embedding-workflow.use-case';

const payload: FinalizeEmbeddingWorkflowCommand = {
  sourceId: 'source-1',
  syncJobId: 'sync-job-1',
  totalChunks: 2,
};

const chunks: EmbedSourceChunkResult[] = [
  {
    kind: 'chunk',
    chunkIndex: 1,
    chunkContent: 'second',
    model: 'qwen3-embedding:0.6b',
    embedding: VALID_EMBEDDING,
  },
  {
    kind: 'chunk',
    chunkIndex: 0,
    chunkContent: 'first',
    model: 'qwen3-embedding:0.6b',
    embedding: VALID_EMBEDDING,
  },
];

function buildUseCase() {
  const upsert = vi.fn().mockResolvedValue(undefined);
  const append = vi.fn<OutboxWriter['append']>().mockResolvedValue(undefined);
  const unitOfWork: IngestionUnitOfWork = {
    execute: (work) =>
      work({ sourceEmbeddings: { upsert, find: vi.fn() }, outbox: { append } }),
  };
  const dispatch = vi
    .fn<IntegrationEventDispatcher['dispatch']>()
    .mockResolvedValue(undefined);
  return {
    useCase: new FinalizeEmbeddingWorkflowUseCase(unitOfWork, { dispatch }),
    upsert,
    append,
    dispatch,
  };
}

describe('FinalizeEmbeddingWorkflowUseCase', () => {
  it('child 결과를 index 순으로 저장하고 completed를 outbox에 기록한다', async () => {
    const { useCase, upsert, append, dispatch } = buildUseCase();

    await useCase.execute(payload, chunks);

    const saved = upsert.mock.calls[0][0] as SourceEmbedding;
    expect(
      saved.getProps().chunks.map((chunk) => chunk.unpack().chunkIndex),
    ).toEqual([0, 1]);
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'source.ingestion.completed',
        payload: { syncJobId: 'sync-job-1', totalChunks: 2 },
      }),
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('누락된 child 결과는 저장하지 않는다', async () => {
    const { useCase, upsert } = buildUseCase();

    await expect(
      useCase.execute(payload, chunks.slice(0, 1)),
    ).rejects.toMatchObject({
      name: 'ApplicationException',
      kind: APPLICATION_ERROR_KIND.STATE_CONFLICT,
      code: 'ingestion.embedding_workflow_result_incomplete',
      message: 'Embedding workflow result is incomplete',
      details: {
        syncJobId: 'sync-job-1',
        expectedChunks: 2,
        actualChunks: 1,
      },
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('서로 다른 model 결과는 저장하지 않는다', async () => {
    const { useCase, upsert } = buildUseCase();
    const inconsistentChunks = [
      chunks[0],
      { ...chunks[1], model: 'another-model' },
    ];

    await expect(
      useCase.execute(payload, inconsistentChunks),
    ).rejects.toMatchObject({
      name: 'ApplicationException',
      kind: APPLICATION_ERROR_KIND.STATE_CONFLICT,
      code: 'ingestion.embedding_workflow_models_inconsistent',
      message: 'Embedding workflow returned inconsistent models',
      details: {
        syncJobId: 'sync-job-1',
        models: ['qwen3-embedding:0.6b', 'another-model'],
      },
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('finalize 실패를 sync job 실패 이벤트로 변환한다', async () => {
    const { useCase, dispatch } = buildUseCase();

    await useCase.handleFailure({ ...payload, syncJobId: 'sync-job-42' });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'source.ingestion.failed',
        payload: { syncJobId: 'sync-job-42' },
      }),
    );
  });
});
