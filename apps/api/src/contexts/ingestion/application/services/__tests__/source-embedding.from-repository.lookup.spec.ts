import { describe, expect, it, vi } from 'vitest';
import {
  SourceEmbedding,
  type SourceEmbeddingRepository,
} from '@contexts/ingestion/domain';
import { SourceEmbeddingFromRepositoryLookup } from '../source-embedding.from-repository.lookup';

const fakeEmbedding = Array.from({ length: 1024 }, () => 0.1);
const fakeModel = 'qwen3-embedding:0.6b';

function buildMockRepository(find = vi.fn()): SourceEmbeddingRepository {
  return { find, save: vi.fn() } satisfies SourceEmbeddingRepository;
}

describe('SourceEmbeddingFromRepositoryLookup', () => {
  describe('find', () => {
    it('저장된 SourceEmbedding을 model/dimensions/createdAt/updatedAt으로 매핑해 반환한다', async () => {
      const sourceEmbedding = SourceEmbedding.create({
        sourceId: 'source-1',
        model: fakeModel,
        chunks: [
          { chunkIndex: 0, chunkContent: 'chunk', embedding: fakeEmbedding },
        ],
      });
      const repository = buildMockRepository(
        vi.fn().mockResolvedValue(sourceEmbedding),
      );
      const service = new SourceEmbeddingFromRepositoryLookup(repository);

      const result = await service.find({ sourceId: 'source-1' });

      expect(result).toEqual({
        model: fakeModel,
        dimensions: 1024,
        createdAt: sourceEmbedding.createdAt,
        updatedAt: sourceEmbedding.updatedAt,
      });
    });

    it('repository가 null을 반환하면 null을 반환한다', async () => {
      const repository = buildMockRepository(vi.fn().mockResolvedValue(null));
      const service = new SourceEmbeddingFromRepositoryLookup(repository);

      const result = await service.find({ sourceId: 'missing' });

      expect(result).toBeNull();
    });
  });
});
