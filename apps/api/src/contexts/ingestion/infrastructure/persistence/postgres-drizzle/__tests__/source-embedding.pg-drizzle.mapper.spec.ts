import { describe, expect, it } from 'vitest';
import {
  buildSourceEmbedding,
  VALID_EMBEDDING,
} from '../../../../../../../test/support/domains/fixtures/source-embedding.fixture';
import { buildSourceEmbeddingRow } from '../../../../../../../test/adapters/postgres/ingestion/fixtures/source-embedding-row.fixture';
import { SourceEmbeddingPgDrizzleMapper } from '../source-embedding.pg-drizzle.mapper';

describe('SourceEmbeddingPgDrizzleMapper', () => {
  it('valid source embedding rows를 SourceEmbedding aggregate로 복원한다', () => {
    const rows = [
      buildSourceEmbeddingRow({ chunkIndex: 0, chunkContent: 'first' }),
      buildSourceEmbeddingRow({ chunkIndex: 1, chunkContent: 'second' }),
    ];

    const sourceEmbedding = SourceEmbeddingPgDrizzleMapper.toDomain(rows);

    expect(sourceEmbedding.id).toBe('source-1');
    expect(sourceEmbedding.getProps().model.unpack()).toBe(
      'qwen3-embedding:0.6b',
    );
    expect(sourceEmbedding.getProps().chunks).toHaveLength(2);
    expect(sourceEmbedding.getProps().chunks[0].unpack().chunkContent).toBe(
      'first',
    );
    expect(sourceEmbedding.getProps().chunks[1].unpack().chunkContent).toBe(
      'second',
    );
  });

  it('source embedding row의 model이 지원하지 않으면 throw한다', () => {
    const rows = [buildSourceEmbeddingRow({ model: 'unsupported-model' })];

    expect(() => SourceEmbeddingPgDrizzleMapper.toDomain(rows)).toThrow(
      'Unsupported embedding model: unsupported-model',
    );
  });

  it('SourceEmbedding aggregate를 insert rows로 변환한다', () => {
    const sourceEmbedding = buildSourceEmbedding();

    const rows = SourceEmbeddingPgDrizzleMapper.toInserts(sourceEmbedding);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      sourceId: 'source-1',
      chunkIndex: 0,
      chunkContent: 'default chunk content',
      embedding: VALID_EMBEDDING,
      model: 'qwen3-embedding:0.6b',
    });
  });

  it('복수 청크를 가진 aggregate를 여러 insert rows로 변환한다', () => {
    const sourceEmbedding = buildSourceEmbedding({
      chunks: [
        { chunkIndex: 0, chunkContent: 'first' },
        { chunkIndex: 1, chunkContent: 'second' },
      ],
    });

    const rows = SourceEmbeddingPgDrizzleMapper.toInserts(sourceEmbedding);

    expect(rows).toHaveLength(2);
    expect(rows[0].chunkIndex).toBe(0);
    expect(rows[1].chunkIndex).toBe(1);
  });
});
