import { describe, expect, it } from 'vitest';
import { EmbeddingModel } from '../embedding-model.vo';
import { EmbeddingVector } from '../embedding-vector.vo';
import { ChunkVector } from '../chunk-vector.vo';

const model = EmbeddingModel.of('qwen3-embedding:0.6b');
const validEmbedding = EmbeddingVector.of(
  Array.from({ length: 1024 }, (_, i) => i * 0.001),
  model,
);

describe('ChunkVector', () => {
  it('유효한 파라미터로 ChunkVector를 생성한다', () => {
    const chunk = ChunkVector.of({
      chunkIndex: 0,
      chunkContent: 'some text',
      embedding: validEmbedding,
    });

    expect(chunk.unpack().chunkIndex).toBe(0);
    expect(chunk.unpack().chunkContent).toBe('some text');
  });

  it('chunkIndex가 음수이면 throw한다', () => {
    expect(() =>
      ChunkVector.of({
        chunkIndex: -1,
        chunkContent: 'text',
        embedding: validEmbedding,
      }),
    ).toThrow('Chunk index must be a non-negative integer');
  });

  it('chunkIndex가 소수이면 throw한다', () => {
    expect(() =>
      ChunkVector.of({
        chunkIndex: 1.5,
        chunkContent: 'text',
        embedding: validEmbedding,
      }),
    ).toThrow('Chunk index must be a non-negative integer');
  });

  it('chunkIndex가 0이면 유효하다', () => {
    expect(() =>
      ChunkVector.of({
        chunkIndex: 0,
        chunkContent: 'text',
        embedding: validEmbedding,
      }),
    ).not.toThrow();
  });
});
