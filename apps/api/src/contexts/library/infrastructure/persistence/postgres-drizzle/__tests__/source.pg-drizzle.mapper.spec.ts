import { sha256Hex } from '@core/hash';
import { describe, expect, it } from 'vitest';
import {
  buildSource,
  sourceContentByteSize,
  sourceContentOf,
} from '../../../../../../../test/support/domains/fixtures/source.fixture';
import { buildSourceRow } from '../../../../../../../test/adapters/postgres/library/fixtures/source-row.fixture';
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
    expect(sourceContentOf(source)).toEqual({
      body: '안녕',
      frontmatter: { title: '인사' },
      title: '인사',
      fingerprint: 'fingerprint-1',
      size: sourceContentByteSize('안녕'),
    });
  });

  it('library.source-3: 저장된 title 대신 frontmatter에서 제목을 다시 만든다', () => {
    const row = buildSourceRow({
      frontmatter: { title: '인사' },
      title: 'stale title',
    });

    const source = SourcePgDrizzleMapper.toDomain(row);

    expect(sourceContentOf(source).title).toBe('인사');
  });

  it('source row의 크기가 음수면 domain invariant error를 throw한다', () => {
    const row = buildSourceRow({ sizeBytes: -1 });

    expect(() => SourcePgDrizzleMapper.toDomain(row)).toThrow(
      'Source size must be a non-negative integer',
    );
  });

  it('Source aggregate를 source insert row로 변환한다', () => {
    const source = buildSource();

    const row = SourcePgDrizzleMapper.toInsert(source);

    expect(row).toEqual({
      id: source.id,
      externalSourceId: 'Notes/source.md',
      body: '# Source note',
      frontmatter: { sheska: true },
      title: 'Notes/source.md',
      fingerprint: sha256Hex('# Source note'),
      sizeBytes: sourceContentByteSize('# Source note'),
    });
  });
});
