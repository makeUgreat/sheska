import { describe, expect, it } from 'vitest';
import {
  buildSourceVector,
  VALID_EMBEDDING,
} from '../../../../../../../test/domains/fixtures/source-vector.fixture';
import { buildSourceVectorRow } from '../../../../../../../test/postgres/ingestion/fixtures/source-vector-row.fixture';
import { SourceVectorPgDrizzleMapper } from '../source-vector.pg-drizzle.mapper';

describe('SourceVectorPgDrizzleMapper', () => {
  it('valid source vector row를 SourceVector aggregate로 복원한다', () => {
    const row = buildSourceVectorRow();

    const sourceVector = SourceVectorPgDrizzleMapper.toDomain(row);

    expect(sourceVector.id).toBe('source-1');
    expect(sourceVector.getProps().model.unpack()).toBe('qwen3-embedding:0.6b');
    expect(sourceVector.getProps().embedding.unpack().values).toEqual(
      VALID_EMBEDDING,
    );
  });

  it('source vector row의 model이 지원하지 않으면 throw한다', () => {
    const row = buildSourceVectorRow({ model: 'unsupported-model' });

    expect(() => SourceVectorPgDrizzleMapper.toDomain(row)).toThrow(
      'Unsupported embedding model: unsupported-model',
    );
  });

  it('SourceVector aggregate를 insert row로 변환한다', () => {
    const sourceVector = buildSourceVector();

    const row = SourceVectorPgDrizzleMapper.toInsert(sourceVector);

    expect(row).toEqual({
      sourceId: 'source-1',
      embedding: VALID_EMBEDDING,
      model: 'qwen3-embedding:0.6b',
    });
  });
});
