import { describe, expect, it } from 'vitest';
import { SourceVector } from '../source-vector.aggregate';

const validEmbedding = Array.from({ length: 1024 }, (_, i) => i * 0.001);

describe('SourceVector', () => {
  describe('create', () => {
    it('유효한 파라미터로 SourceVector를 생성한다', () => {
      const sourceVector = SourceVector.create({
        sourceId: 'source-1',
        embedding: validEmbedding,
        model: 'nomic-embed-text',
      });
      const props = sourceVector.getProps();

      expect(sourceVector.id).toBe('source-1');
      expect(props.model.unpack()).toBe('nomic-embed-text');
      expect(props.embedding.unpack().values).toEqual(validEmbedding);
    });

    it('지원하지 않는 모델이면 throw한다', () => {
      expect(() =>
        SourceVector.create({
          sourceId: 'source-1',
          embedding: validEmbedding,
          model: 'unknown-model',
        }),
      ).toThrow('Unsupported embedding model: unknown-model');
    });

    it('dimension이 모델 spec과 다르면 throw한다', () => {
      expect(() =>
        SourceVector.create({
          sourceId: 'source-1',
          embedding: [0.1, 0.2],
          model: 'nomic-embed-text',
        }),
      ).toThrow('Embedding vector must have 1024 dimensions, got 2');
    });
  });

  describe('restore', () => {
    it('저장된 sourceId를 id로 복원한다', () => {
      const sourceVector = SourceVector.restore({
        sourceId: 'source-1',
        embedding: validEmbedding,
        model: 'nomic-embed-text',
      });

      expect(sourceVector.id).toBe('source-1');
    });
  });
});
