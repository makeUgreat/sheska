import { Source, SourceContentSnapshot } from '@contexts/library/domain';
import { describe, expect, it } from 'vitest';

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const snapshot = {
  body: '# Source note',
  frontmatter: { title: 'Source note' },
  title: 'Source note',
  fingerprint: 'fingerprint-1',
  size: 50,
} as const;

describe('Source', () => {
  it('파싱된 document snapshot으로 source를 생성한다', () => {
    const source = Source.create({
      externalSourceId: ' Notes/source.md ',
      ...snapshot,
    });

    expect(source.id).toMatch(UUID_V7_PATTERN);
    expect(source.getProps().externalSourceId.unpack()).toBe('Notes/source.md');
    expect(source.getProps().contentSnapshot).toEqual(
      SourceContentSnapshot.of(snapshot),
    );
  });

  it('frontmatter title이 없으면 externalSourceId를 title로 저장한다', () => {
    const source = Source.create({
      externalSourceId: ' Notes/source.md ',
      ...snapshot,
      frontmatter: {},
      title: null,
    });

    expect(source.getProps().contentSnapshot.unpack().title).toBe(
      'Notes/source.md',
    );
  });

  it('같은 fingerprint이면 snapshot을 바꾸지 않는다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...snapshot,
    });

    const result = source.syncContentSnapshot({
      ...snapshot,
      body: '# Changed',
    });

    expect(result.changed).toBe(false);
    expect(source.getProps().contentSnapshot.unpack().body).toBe(
      '# Source note',
    );
  });

  it('다른 fingerprint이면 snapshot을 갱신한다', () => {
    const source = Source.create({
      externalSourceId: 'Notes/source.md',
      ...snapshot,
    });
    const next = {
      body: '# Changed',
      frontmatter: { title: 'Changed' },
      title: 'Changed',
      fingerprint: 'fingerprint-2',
      size: 40,
    } as const;

    const result = source.syncContentSnapshot(next);

    expect(result.changed).toBe(true);
    expect(source.getProps().contentSnapshot).toEqual(
      SourceContentSnapshot.of(next),
    );
  });
});
