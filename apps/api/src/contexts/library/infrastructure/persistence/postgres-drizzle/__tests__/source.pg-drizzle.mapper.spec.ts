import { sha256Hex } from '@core/hash';
import { describe, expect, it } from 'vitest';
import { buildSource, sourceContentByteSize, sourceContentOf } from '../../../../../../../test/support/domains/fixtures/source.fixture';
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
      series: { kind: 'none' },
      project: { kind: 'none' },
      title: '인사',
      fingerprint: 'fingerprint-1',
      size: sourceContentByteSize('안녕'),
    });
  });

  // nocap: library-source-3
  it('저장된 title 대신 frontmatter에서 제목을 다시 만든다', () => {
    const row = buildSourceRow({
      frontmatter: { title: '인사' },
      title: 'stale title',
    });

    const source = SourcePgDrizzleMapper.toDomain(row);

    expect(sourceContentOf(source).title).toBe('인사');
  });

  it('source row의 크기가 음수면 domain invariant error를 throw한다', () => {
    const row = buildSourceRow({ sizeBytes: -1 });

    expect(() => SourcePgDrizzleMapper.toDomain(row)).toThrow('Source size must be a non-negative integer');
  });

  it.each([
    ['series만 있으면', { series: 'RAG', seriesOrder: null }],
    ['series_order만 있으면', { series: null, seriesOrder: 1 }],
  ])('저장된 시리즈 열 중 %s domain invariant error를 throw한다', (_label, columns) => {
    const row = buildSourceRow(columns);

    expect(() => SourcePgDrizzleMapper.toDomain(row)).toThrow(
      expect.objectContaining({ kind: 'invariant_violation', code: 'source.partial_series' }),
    );
  });

  it('저장된 시리즈 열로 시리즈를 복원한다', () => {
    const row = buildSourceRow({ series: 'RAG', seriesOrder: 2 });

    const source = SourcePgDrizzleMapper.toDomain(row);

    expect(source.getProps().series.unpack()).toEqual({ kind: 'member', name: 'RAG', order: 2 });
  });

  it('시리즈를 시리즈 열로 변환한다', () => {
    const source = buildSource({ frontmatter: { series: 'RAG', series_order: 2 } });

    const row = SourcePgDrizzleMapper.toInsert(source);

    expect(row).toMatchObject({ series: 'RAG', seriesOrder: 2 });
  });

  it('저장된 관련 프로젝트 열로 관련 프로젝트를 복원한다', () => {
    const row = buildSourceRow({ project: 'siru' });

    const source = SourcePgDrizzleMapper.toDomain(row);

    expect(source.getProps().project.unpack()).toEqual({ kind: 'related', name: 'siru' });
  });

  it('관련 프로젝트를 관련 프로젝트 열로 변환한다', () => {
    const source = buildSource({ frontmatter: { project: 'siru' } });

    const row = SourcePgDrizzleMapper.toInsert(source);

    expect(row).toMatchObject({ project: 'siru' });
  });

  it('Source aggregate를 source insert row로 변환한다', () => {
    const source = buildSource();

    const row = SourcePgDrizzleMapper.toInsert(source);

    expect(row).toEqual({
      id: source.id,
      externalSourceId: 'Notes/source.md',
      body: '# Source note',
      frontmatter: { sheska: true },
      series: null,
      seriesOrder: null,
      project: null,
      title: 'Notes/source.md',
      fingerprint: sha256Hex('# Source note'),
      sizeBytes: sourceContentByteSize('# Source note'),
    });
  });
});
