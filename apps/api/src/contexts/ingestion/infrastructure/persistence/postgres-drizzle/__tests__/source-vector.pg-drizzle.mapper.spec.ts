import { describe, expect, it } from 'vitest';
import {
  buildSourceVector,
  VALID_EMBEDDING,
} from '../../../../../../../test/support/domains/fixtures/source-vector.fixture';
import { buildSourceVectorRow } from '../../../../../../../test/adapters/postgres/ingestion/fixtures/source-vector-row.fixture';
import { SourceVectorPgDrizzleMapper } from '../source-vector.pg-drizzle.mapper';

describe('SourceVectorPgDrizzleMapper', () => {
  it('valid source vector rows를 SourceVector aggregate로 복원한다', () => {
    const rows = [
      buildSourceVectorRow({ chunkIndex: 0, chunkContent: 'first' }),
      buildSourceVectorRow({ chunkIndex: 1, chunkContent: 'second' }),
    ];

    const sourceVector = SourceVectorPgDrizzleMapper.toDomain(rows);

    expect(sourceVector.id).toBe('source-1');
    expect(sourceVector.getProps().model.unpack()).toBe('qwen3-embedding:0.6b');
    expect(sourceVector.getProps().chunks).toHaveLength(2);
    expect(sourceVector.getProps().chunks[0].unpack().chunkContent).toBe(
      'first',
    );
    expect(sourceVector.getProps().chunks[1].unpack().chunkContent).toBe(
      'second',
    );
  });

  it('source vector row의 model이 지원하지 않으면 throw한다', () => {
    const rows = [buildSourceVectorRow({ model: 'unsupported-model' })];

    expect(() => SourceVectorPgDrizzleMapper.toDomain(rows)).toThrow(
      'Unsupported embedding model: unsupported-model',
    );
  });

  it('SourceVector aggregate를 insert rows로 변환한다', () => {
    const sourceVector = buildSourceVector();

    const rows = SourceVectorPgDrizzleMapper.toInserts(sourceVector);

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
    const sourceVector = buildSourceVector({
      chunks: [
        { chunkIndex: 0, chunkContent: 'first' },
        { chunkIndex: 1, chunkContent: 'second' },
      ],
    });

    const rows = SourceVectorPgDrizzleMapper.toInserts(sourceVector);

    expect(rows).toHaveLength(2);
    expect(rows[0].chunkIndex).toBe(0);
    expect(rows[1].chunkIndex).toBe(1);
  });
});
