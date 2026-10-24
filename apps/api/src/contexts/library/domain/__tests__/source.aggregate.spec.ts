import { sha256Hex } from '@core/hash';
import {
  Source,
  SourceSyncJob,
  type SourceFrontmatterProps,
} from '@contexts/library/domain';
import { describe, expect, it } from 'vitest';
import { sourceContentOf } from '../../../../../test/support/domains/fixtures/source.fixture';

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const content = {
  body: '# Source note',
  frontmatter: { sheska: true, title: 'Source note' },
  size: 50,
};

function titleOf(frontmatter: SourceFrontmatterProps): string {
  return Source.create({
    externalSourceId: ' Notes/source.md ',
    ...content,
    frontmatter: { sheska: true, ...frontmatter },
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
      title: 'Source note',
      fingerprint: sha256Hex(content.body),
    });
  });

  it('library.source-3: frontmatter title이 비어 있지 않은 문자열이면 그 값을 제목으로 쓴다', () => {
    expect(titleOf({ title: '회고' })).toBe('회고');
  });

  it('library.source-3: 제목의 앞뒤 공백은 뺀다', () => {
    expect(titleOf({ title: ' Retry Amplification ' })).toBe(
      'Retry Amplification',
    );
  });

  it.each([
    ['없음', {}],
    ['빈 문자열', { title: '' }],
    ['공백뿐인 문자열', { title: '  ' }],
    ['숫자', { title: 3 }],
    ['null', { title: null }],
  ])(
    'library.source-3: frontmatter title이 %s이면 externalSourceId를 제목으로 쓴다',
    (_label, frontmatter: SourceFrontmatterProps) => {
      expect(titleOf(frontmatter)).toBe('Notes/source.md');
    },
  );

  it('library.source-6: 동기화 대상이 아닌 frontmatter로는 source를 만들 수 없다', () => {
    expect(() =>
      Source.create({
        externalSourceId: 'Notes/source.md',
        ...content,
        frontmatter: { title: 'Source note' },
      }),
    ).toThrow(expect.objectContaining({ code: 'source.not_sync_target' }));
  });

  it('library.source-6: 동기화 대상이 아닌 frontmatter로는 source를 갱신할 수 없다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...content,
    });

    expect(() =>
      source.syncContent({ ...content, frontmatter: { sheska: false } }),
    ).toThrow(expect.objectContaining({ code: 'source.not_sync_target' }));
    expect(sourceContentOf(source).frontmatter).toEqual(content.frontmatter);
  });

  it('아무것도 바뀌지 않으면 내용을 바꾸지 않는다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...content,
    });

    const result = source.syncContent(content);

    expect(result).toBe(false);
  });

  it('library.sync-5, library.sync-6: frontmatter만 바뀌면 내용을 갱신하고 fingerprint는 그대로다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...content,
    });
    const next = {
      ...content,
      frontmatter: { sheska: true, title: 'Renamed', tags: ['a'] },
    };

    const result = source.syncContent(next);

    expect(result).toBe(true);
    expect(sourceContentOf(source)).toEqual({
      ...next,
      title: 'Renamed',
      fingerprint: sha256Hex(content.body),
    });
  });

  it('library.sync-5: frontmatter 키 순서만 다르면 바뀌지 않은 것이다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...content,
      frontmatter: { sheska: true, tags: ['a'] },
    });

    const result = source.syncContent({
      ...content,
      frontmatter: { tags: ['a'], sheska: true },
    });

    expect(result).toBe(false);
  });

  it('library.sync-5: 크기만 달라도 내용을 갱신한다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...content,
    });

    const result = source.syncContent({ ...content, size: 51 });

    expect(result).toBe(true);
    expect(sourceContentOf(source).size).toBe(51);
  });

  it('library.sync-5, library.sync-6: 본문이 바뀌면 내용과 fingerprint를 갱신한다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...content,
    });
    const next = { ...content, body: '# Changed', size: 40 };

    const result = source.syncContent(next);

    expect(result).toBe(true);
    expect(sourceContentOf(source)).toEqual({
      ...next,
      title: 'Source note',
      fingerprint: sha256Hex('# Changed'),
    });
  });

  it('복원은 저장된 fingerprint를 그대로 쓴다', () => {
    const source = Source.restore({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      ...content,
      fingerprint: 'stored-fingerprint',
    });

    expect(sourceContentOf(source).fingerprint).toBe('stored-fingerprint');
  });

  it('library.source-3: 복원할 때 제목을 frontmatter에서 다시 만든다', () => {
    const source = Source.restore({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      ...content,
      frontmatter: {},
      fingerprint: sha256Hex(content.body),
    });

    expect(sourceContentOf(source).title).toBe('Notes/source.md');
  });

  describe('syncJobFor', () => {
    it.each([
      ['없으면', null],
      ['failed이면 fingerprint가 같아도', restoreSyncJob('failed', 'same')],
      [
        'completed이고 fingerprint가 다르면',
        restoreSyncJob('completed', 'other'),
      ],
      ['waiting이고 fingerprint가 다르면', restoreSyncJob('waiting', 'other')],
    ])(
      'library.sync-7: 가장 최근 sync job이 %s 새 sync job을 만든다',
      (_label, latestSyncJob) => {
        const source = buildSourceForSync();

        expect(source.syncJobFor(latestSyncJob)).not.toBe(latestSyncJob);
      },
    );

    it.each(['waiting', 'completed'] as const)(
      'library.sync-7: 가장 최근 sync job이 현재 fingerprint에 대한 %s이면 그 sync job을 쓴다',
      (status) => {
        const source = buildSourceForSync();
        const latestSyncJob = restoreSyncJob(status, 'same');

        expect(source.syncJobFor(latestSyncJob)).toBe(latestSyncJob);
      },
    );

    it('새 sync job은 source의 본문과 fingerprint로 만든다', () => {
      const source = buildSourceForSync();

      const syncJob = source.syncJobFor(null);

      expect(syncJob.getProps()).toMatchObject({
        sourceId: source.id,
        status: 'waiting',
      });
      expect(syncJob.getProps().fingerprint.unpack()).toBe(
        sha256Hex(content.body),
      );
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

function restoreSyncJob(
  status: 'waiting' | 'completed' | 'failed',
  fingerprint: 'same' | 'other',
): SourceSyncJob {
  return SourceSyncJob.restore({
    id: 'sync-job-1',
    sourceId: 'source-1',
    fingerprint:
      fingerprint === 'same' ? sha256Hex(content.body) : 'other-fingerprint',
    status,
  });
}
