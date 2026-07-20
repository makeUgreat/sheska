import { describe, expect, it } from 'vitest';
import { SourceVector } from '../source-vector.aggregate';

const validEmbedding = Array.from({ length: 1024 }, (_, i) => i * 0.001);

const validChunks = [
  { chunkIndex: 0, chunkContent: 'first chunk', embedding: validEmbedding },
  { chunkIndex: 1, chunkContent: 'second chunk', embedding: validEmbedding },
];

describe('SourceVector', () => {
  describe('create', () => {
    it('유효한 파라미터로 SourceVector를 생성한다', () => {
      const sourceVector = SourceVector.create({
        sourceId: 'source-1',
        model: 'qwen3-embedding:0.6b',
        chunks: validChunks,
      });
      const props = sourceVector.getProps();

      expect(sourceVector.id).toBe('source-1');
      expect(props.model.unpack()).toBe('qwen3-embedding:0.6b');
      expect(props.chunks).toHaveLength(2);
      expect(props.chunks[0].unpack().chunkIndex).toBe(0);
      expect(props.chunks[1].unpack().chunkIndex).toBe(1);
    });

    it('지원하지 않는 모델이면 throw한다', () => {
      expect(() =>
        SourceVector.create({
          sourceId: 'source-1',
          model: 'unknown-model',
          chunks: validChunks,
        }),
      ).toThrow('Unsupported embedding model: unknown-model');
    });

    it('dimension이 모델 spec과 다르면 throw한다', () => {
      expect(() =>
        SourceVector.create({
          sourceId: 'source-1',
          model: 'qwen3-embedding:0.6b',
          chunks: [
            { chunkIndex: 0, chunkContent: 'text', embedding: [0.1, 0.2] },
          ],
        }),
      ).toThrow('Embedding vector must have 1024 dimensions, got 2');
    });
  });

  describe('restore', () => {
    it('저장된 sourceId를 id로 복원한다', () => {
      const sourceVector = SourceVector.restore({
        sourceId: 'source-1',
        model: 'qwen3-embedding:0.6b',
        chunks: validChunks,
      });

      expect(sourceVector.id).toBe('source-1');
    });

    it('모든 청크를 포함하여 복원한다', () => {
      const sourceVector = SourceVector.restore({
        sourceId: 'source-1',
        model: 'qwen3-embedding:0.6b',
        chunks: validChunks,
      });

      expect(sourceVector.getProps().chunks).toHaveLength(2);
    });
  });
});
