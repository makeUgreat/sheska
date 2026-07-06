import { describe, expect, it } from 'vitest';
import { EmbeddingModel } from '../embedding-model.vo';

describe('EmbeddingModel', () => {
  describe('of', () => {
    it('지원하는 모델로 EmbeddingModel을 생성한다', () => {
      const model = EmbeddingModel.of('nomic-embed-text');

      expect(model.unpack()).toBe('nomic-embed-text');
      expect(model.expectedDimensions).toBe(1024);
    });

    it('지원하지 않는 모델이면 throw한다', () => {
      expect(() => EmbeddingModel.of('unknown-model')).toThrow(
        'Unsupported embedding model: unknown-model',
      );
    });
  });
});
