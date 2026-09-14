import { describe, expect, it } from 'vitest';
import {
  buildSource,
  sourceContentByteSize,
} from '../../../../../../../test/support/domains/fixtures/source.fixture';
import { buildSourceRow } from '../../../../../../../test/adapters/postgres/sources/fixtures/source-row.fixture';
import { SourcePgDrizzleMapper } from '../source.pg-drizzle.mapper';

describe('SourcePgDrizzleMapper', () => {
  it('valid source row를 Source aggregate로 복원한다', () => {
    const row = buildSourceRow({
      body: '안녕',
      frontmatter: { title: '인사' },
      title: '인사',
      fingerprint: 'fingerprint-1',
    });

    const source = SourcePgDrizzleMapper.toDomain(row);

    expect(source.id).toBe('source-1');
    expect(source.getProps().externalSourceId.unpack()).toBe('Notes/source.md');
    expect(source.getProps().contentSnapshot.unpack()).toEqual({
      body: '안녕',
      frontmatter: { title: '인사' },
      title: '인사',
      fingerprint: 'fingerprint-1',
      size: sourceContentByteSize('안녕'),
    });
  });

  it('source row의 title이 공백이면 domain invariant error를 throw한다', () => {
    const row = buildSourceRow({
      body: '안녕',
      frontmatter: {},
      title: ' ',
      fingerprint: 'fingerprint-1',
      sizeBytes: 1,
    });

    expect(() => SourcePgDrizzleMapper.toDomain(row)).toThrow(
      'Source title must not be blank',
    );
  });

  it('Source aggregate를 source insert row로 변환한다', () => {
    const source = buildSource();

    const row = SourcePgDrizzleMapper.toInsert(source);

    expect(row).toEqual({
      id: source.id,
      externalSourceId: 'Notes/source.md',
      body: '# Source note',
      frontmatter: {},
      title: 'Notes/source.md',
      fingerprint: 'fingerprint-1',
      sizeBytes: sourceContentByteSize('# Source note'),
    });
  });
});
