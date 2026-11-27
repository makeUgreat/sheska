import { sha256Hex } from '@core/hash';
import {
  Source,
  SourceBodyChangedDomainEvent,
  SourceFrontmatter,
  SourceSyncJob,
  type SourceFrontmatterProps,
} from '@contexts/library/domain';
import { describe, expect, it } from 'vitest';
import { buildSource, sourceContentOf } from '../../../../../test/support/domains/fixtures/source.fixture';

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const frontmatterProps = { sheska: true, title: 'Source note' };
const content = {
  body: '# Source note',
  frontmatter: SourceFrontmatter.parse(frontmatterProps),
  size: 50,
};

function titleOf(frontmatter: SourceFrontmatterProps): string {
  return Source.create({
    externalSourceId: ' Notes/source.md ',
    ...content,
    frontmatter: SourceFrontmatter.parse({ sheska: true, ...frontmatter }),
  }).title();
}

describe('Source', () => {
  it('파싱된 document 내용으로 source를 생성한다', () => {
    const source = Source.create({
      externalSourceId: ' Notes/source.md ',
      ...content,
    });

    expect(source.id).toMatch(UUID_V7_PATTERN);
    expect(source.getProps().externalSourceId.unpack()).toBe('Notes/source.md');
    expect(sourceContentOf(source)).toEqual({
      ...content,
      frontmatter: frontmatterProps,
      title: 'Source note',
      fingerprint: sha256Hex(content.body),
    });
  });

  // nocap: library-source-3
  it('frontmatter title이 비어 있지 않은 문자열이면 그 값을 제목으로 쓴다', () => {
    expect(titleOf({ title: '회고' })).toBe('회고');
  });

  // nocap: library-source-3
  it('제목의 앞뒤 공백은 뺀다', () => {
    expect(titleOf({ title: ' Retry Amplification ' })).toBe('Retry Amplification');
  });

  // nocap: library-source-3
  it.each([
    ['없음', {}],
    ['빈 문자열', { title: '' }],
    ['공백뿐인 문자열', { title: '  ' }],
    ['숫자', { title: 3 }],
    ['null', { title: null }],
  ])('frontmatter title이 %s이면 externalSourceId를 제목으로 쓴다', (_label, frontmatter: SourceFrontmatterProps) => {
    expect(titleOf(frontmatter)).toBe('Notes/source.md');
  });

  it('아무것도 바뀌지 않으면 내용을 바꾸지 않는다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...content,
    });

    const result = source.syncContent(content);

    expect(result).toBe(false);
  });

  // nocap: library-sync-5
  // nocap: library-sync-6
  it('frontmatter만 바뀌면 내용을 갱신하고 fingerprint는 그대로다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...content,
    });
    const nextFrontmatterProps = { sheska: true, title: 'Renamed', tags: ['a'] };
    const next = { ...content, frontmatter: SourceFrontmatter.parse(nextFrontmatterProps) };

    const result = source.syncContent(next);

    expect(result).toBe(true);
    expect(sourceContentOf(source)).toEqual({
      ...next,
      frontmatter: nextFrontmatterProps,
      title: 'Renamed',
      fingerprint: sha256Hex(content.body),
    });
  });

  // nocap: library-sync-5
  it('frontmatter 키 순서만 다르면 바뀌지 않은 것이다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...content,
      frontmatter: SourceFrontmatter.parse({ sheska: true, tags: ['a'] }),
    });

    const result = source.syncContent({
      ...content,
      frontmatter: SourceFrontmatter.parse({ tags: ['a'], sheska: true }),
    });

    expect(result).toBe(false);
  });

  // nocap: library-sync-5
  it('크기만 달라도 내용을 갱신한다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...content,
    });

    const result = source.syncContent({ ...content, size: 51 });

    expect(result).toBe(true);
    expect(sourceContentOf(source).size).toBe(51);
  });

  // nocap: library-sync-5
  // nocap: library-sync-6
  it('본문이 바뀌면 내용과 fingerprint를 갱신한다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...content,
    });
    const next = { ...content, body: '# Changed', size: 40 };

    const result = source.syncContent(next);

    expect(result).toBe(true);
    expect(sourceContentOf(source)).toEqual({
      ...next,
      frontmatter: frontmatterProps,
      title: 'Source note',
      fingerprint: sha256Hex('# Changed'),
    });
  });

  it('본문이 바뀌면 본문 변경 사건을 기록한다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...content,
    });

    source.syncContent({ ...content, body: '# Changed' });

    expect(source.domainEvents).toHaveLength(1);
    expect(source.domainEvents[0]).toBeInstanceOf(SourceBodyChangedDomainEvent);
    expect(source.domainEvents[0]?.aggregateId).toBe(source.id);
  });

  // nocap: library-summary-2
  it.each([
    { name: '새로 만들 때', change: (source: Source) => source },
    {
      name: 'frontmatter만 바뀔 때',
      change: (source: Source) =>
        source.syncContent({ ...content, frontmatter: SourceFrontmatter.parse({ sheska: true, title: 'Renamed' }) }),
    },
    { name: '크기만 바뀔 때', change: (source: Source) => source.syncContent({ ...content, size: 51 }) },
  ])('$name는 본문 변경 사건을 기록하지 않는다', ({ change }) => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...content,
    });

    change(source);

    expect(source.domainEvents).toEqual([]);
  });

  it('복원은 저장된 fingerprint를 그대로 쓴다', () => {
    const source = Source.restore({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      ...content,
      frontmatter: frontmatterProps,
      fingerprint: 'stored-fingerprint',
    });

    expect(sourceContentOf(source).fingerprint).toBe('stored-fingerprint');
  });

  // nocap: library-source-3
  it('복원할 때 제목을 frontmatter에서 다시 만든다', () => {
    const source = Source.restore({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      ...content,
      frontmatter: {},
      fingerprint: sha256Hex(content.body),
    });

    expect(sourceContentOf(source).title).toBe('Notes/source.md');
  });

  describe('moveTo', () => {
    it('새 경로로 바꾼다', () => {
      const source = buildSource({ externalSourceId: 'Notes/old.md' });

      source.moveTo('Notes/new.md');

      expect(source.getProps().externalSourceId.unpack()).toBe('Notes/new.md');
    });

    it('frontmatter title이 없으면 제목이 새 경로를 따른다', () => {
      const source = buildSource({ externalSourceId: 'Notes/old.md' });

      source.moveTo('Notes/new.md');

      expect(source.title()).toBe('Notes/new.md');
    });

    it('새 경로가 비어 있으면 거부한다', () => {
      const source = buildSource({ externalSourceId: 'Notes/old.md' });

      expect(() => source.moveTo('  ')).toThrow(expect.objectContaining({ code: 'source.empty_external_source_id' }));
    });
  });

  describe('syncJobFor', () => {
    // nocap: library-sync-7
    it.each([
      ['없으면', null],
      ['failed이면 fingerprint가 같아도', restoreSyncJob('failed', 'same')],
      ['completed이고 fingerprint가 다르면', restoreSyncJob('completed', 'other')],
      ['waiting이고 fingerprint가 다르면', restoreSyncJob('waiting', 'other')],
    ])('가장 최근 sync job이 %s 새 sync job을 만든다', (_label, latestSyncJob) => {
      const source = buildSourceForSync();

      expect(source.syncJobFor(latestSyncJob)).not.toBe(latestSyncJob);
    });

    // nocap: library-sync-7
    it.each(['waiting', 'completed'] as const)('가장 최근 sync job이 현재 fingerprint에 대한 %s이면 그 sync job을 쓴다', (status) => {
      const source = buildSourceForSync();
      const latestSyncJob = restoreSyncJob(status, 'same');

      expect(source.syncJobFor(latestSyncJob)).toBe(latestSyncJob);
    });

    it('새 sync job은 source의 본문과 fingerprint로 만든다', () => {
      const source = buildSourceForSync();

      const syncJob = source.syncJobFor(null);

      expect(syncJob.getProps()).toMatchObject({
        sourceId: source.id,
        status: 'waiting',
      });
      expect(syncJob.getProps().fingerprint.unpack()).toBe(sha256Hex(content.body));
      expect(syncJob.domainEvents[0]).toMatchObject({
        sourceId: source.id,
        content: content.body,
      });
    });
  });
});

function buildSourceForSync(): Source {
  return Source.create({ externalSourceId: 'Notes/source.md', ...content });
}

function restoreSyncJob(status: 'waiting' | 'completed' | 'failed', fingerprint: 'same' | 'other'): SourceSyncJob {
  return SourceSyncJob.restore({
    id: 'sync-job-1',
    sourceId: 'source-1',
    fingerprint: fingerprint === 'same' ? sha256Hex(content.body) : 'other-fingerprint',
    status,
  });
}
