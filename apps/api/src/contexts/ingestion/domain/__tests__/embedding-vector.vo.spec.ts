import { describe, expect, it } from 'vitest';
import { EmbeddingModel } from '../embedding-model.vo';
import { EmbeddingVector } from '../embedding-vector.vo';

const model = EmbeddingModel.of('nomic-embed-text');
const validEmbedding = Array.from({ length: 1024 }, (_, i) => i * 0.001);

describe('EmbeddingVector', () => {
  describe('of', () => {
    it('모델의 expected dimension과 일치하면 EmbeddingVector를 생성한다', () => {
      const vector = EmbeddingVector.of(validEmbedding, model);

      expect(vector.unpack().values).toEqual(validEmbedding);
      expect(vector.unpack().dimensions).toBe(1024);
    });

    it('dimension이 모델 spec과 다르면 throw한다', () => {
      const wrongDimension = [0.1, 0.2, 0.3];

      expect(() => EmbeddingVector.of(wrongDimension, model)).toThrow(
        'Embedding vector must have 1024 dimensions, got 3',
      );
    });
  });
});
