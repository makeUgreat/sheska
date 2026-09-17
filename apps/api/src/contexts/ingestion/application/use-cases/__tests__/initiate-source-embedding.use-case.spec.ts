import { describe, expect, it, vi } from 'vitest';
import { type EmbeddingWorkflowDispatcher } from '@contexts/ingestion/application/ports';
import {
  DEFAULT_SEPARATORS,
  RecursiveCharacterChunker,
} from '@contexts/ingestion/application/services/recursive-character.chunker';
import { InitiateSourceEmbeddingUseCase } from '../initiate-source-embedding.use-case';

describe('InitiateSourceEmbeddingUseCase', () => {
  it('content를 chunking하고 workflow를 등록한다', async () => {
    const schedule = vi.fn().mockResolvedValue(undefined);
    const useCase = new InitiateSourceEmbeddingUseCase(
      { schedule } satisfies EmbeddingWorkflowDispatcher,
      new RecursiveCharacterChunker({
        chunkSize: 7,
        chunkOverlap: 0,
        separators: DEFAULT_SEPARATORS,
      }),
    );

    await useCase.execute({
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      content: 'abc\n\ndef\n\nghi',
    });

    expect(schedule).toHaveBeenCalledWith({
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      chunks: [
        { chunkIndex: 0, chunkContent: 'abc' },
        { chunkIndex: 1, chunkContent: 'def' },
        { chunkIndex: 2, chunkContent: 'ghi' },
      ],
    });
  });
});
