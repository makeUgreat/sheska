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

    const source = SourcePersistenceMapper.toDomain(row);

    expect(source.id).toBe('source-1');
    expect(source.getProps().externalSourceId.unpack()).toBe('Notes/source.md');
    expect(source.getProps().contentSnapshot.unpack()).toEqual({
      content: '안녕',
      fingerprint: 'fingerprint-1',
      size: sourceContentByteSize('안녕'),
    });
  });

  it('source row의 persisted snapshot이 domain invariant를 깨면 throw한다', () => {
    const row = buildSourceRow({
      content: '안녕',
      fingerprint: 'fingerprint-1',
      sizeBytes: 1,
    });

    expect(() => SourcePersistenceMapper.toDomain(row)).toThrow(
      'Source size must match content byte size',
    );
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
