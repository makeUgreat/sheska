import { Source } from '@contexts/sources/domain';
import { describe, expect, it } from 'vitest';
import { type SourceRow } from '../schema';
import { SourcePersistenceMapper } from '../source.persistence.mapper';

describe('SourcePersistenceMapper', () => {
  it('valid source row를 Source aggregate로 복원한다', () => {
    const row = createSourceRow({
      content: '안녕',
      fingerprint: 'fingerprint-1',
      sizeBytes: byteSize('안녕'),
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
        size: byteSize('안녕'),
      });
    }
  });

  it('source row의 persisted snapshot이 domain invariant를 깨면 실패한다', () => {
    const row = createSourceRow({
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
    const source = createSource();

    const row = SourcePersistenceMapper.toInsert(source);

    expect(row).toEqual({
      id: source.id,
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
      fingerprint: 'fingerprint-1',
      sizeBytes: byteSize('# Source note'),
    });
  });
});

function createSourceRow(
  params: Pick<SourceRow, 'content' | 'fingerprint' | 'sizeBytes'>,
): SourceRow {
  return {
    id: 'source-1',
    externalSourceId: 'Notes/source.md',
    content: params.content,
    fingerprint: params.fingerprint,
    sizeBytes: params.sizeBytes,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function createSource(): Source {
  return Source.create({
    externalSourceId: 'Notes/source.md',
    content: '# Source note',
    fingerprint: 'fingerprint-1',
    size: byteSize('# Source note'),
  })._unsafeUnwrap();
}

function byteSize(content: string): number {
  return new TextEncoder().encode(content).length;
}
