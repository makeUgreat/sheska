import { describe, expect, it } from 'vitest';
import {
  buildSource,
  sourceContentByteSize,
} from '../../../../../../../test/contexts/sources/fixtures/source.fixture';
import { buildSourceRow } from '../../../../../../../test/postgres/contexts/sources/fixtures/source-row.fixture';
import { SourcePersistenceMapper } from '../source.persistence.mapper';

describe('SourcePersistenceMapper', () => {
  it('valid source row를 Source aggregate로 복원한다', () => {
    const row = buildSourceRow({
      content: '안녕',
      fingerprint: 'fingerprint-1',
    });

    const result = SourcePersistenceMapper.toDomain(row);

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      expect(result.value.id).toBe('source-1');
      expect(result.value.getProps().externalSourceId.value).toBe(
        'Notes/source.md',
      );
      expect(result.value.getProps().contentSnapshot.value).toEqual({
        content: '안녕',
        fingerprint: 'fingerprint-1',
        size: sourceContentByteSize('안녕'),
      });
    }
  });

  it('source row의 persisted snapshot이 domain invariant를 깨면 실패한다', () => {
    const row = buildSourceRow({
      content: '안녕',
      fingerprint: 'fingerprint-1',
      sizeBytes: 1,
    });

    const result = SourcePersistenceMapper.toDomain(row);

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toMatchObject({
        kind: 'invariant_violation',
        code: 'source.size_mismatch',
        message: 'Source size must match content byte size',
        details: { fields: ['content', 'size'] },
      });
    }
  });

  it('Source aggregate를 source insert row로 변환한다', () => {
    const source = buildSource();

    const row = SourcePersistenceMapper.toInsert(source);

    expect(row).toEqual({
      id: source.id,
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
      fingerprint: 'fingerprint-1',
      sizeBytes: sourceContentByteSize('# Source note'),
    });
  });
});
