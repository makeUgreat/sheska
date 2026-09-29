import {
  SourceContentSnapshot,
  SourceFingerprint,
  SourceFrontmatter,
  SourceSize,
} from '@contexts/library/domain';
import { describe, expect, it } from 'vitest';

describe('SourceContentSnapshot', () => {
  it('파싱된 본문과 전체 frontmatter를 보존한다', () => {
    const snapshot = SourceContentSnapshot.of({
      body: '# Source note',
      frontmatter: { title: 'Source note', custom: { enabled: true } },
      title: 'Source note',
      fingerprint: ' fingerprint-1 ',
      size: 100,
    });

    expect(snapshot.unpack()).toEqual({
      body: '# Source note',
      frontmatter: SourceFrontmatter.of({
        title: 'Source note',
        custom: { enabled: true },
      }),
      title: 'Source note',
      fingerprint: SourceFingerprint.of('fingerprint-1'),
      size: SourceSize.of(100),
    });
  });

  it('빈 본문과 size 0을 허용한다', () => {
    const snapshot = SourceContentSnapshot.of({
      body: '',
      frontmatter: {},
      title: 'Notes/empty.md',
      fingerprint: 'empty-fingerprint',
      size: 0,
    });

    expect(snapshot.unpack().size.unpack()).toBe(0);
  });

  it('fingerprint가 공백뿐이면 throw한다', () => {
    expect(() =>
      SourceContentSnapshot.of({
        body: '# Source note',
        frontmatter: {},
        title: 'Notes/source.md',
        fingerprint: ' ',
        size: 13,
      }),
    ).toThrow('Source fingerprint cannot be empty');
  });

  describe('equals', () => {
    const raw = {
      body: '# Source note',
      frontmatter: { title: 'Source note', nested: { a: 1, b: [1, 2] } },
      title: 'Source note',
      fingerprint: 'fingerprint-1',
      size: 100,
    };

    it('모든 필드가 같으면 같다', () => {
      expect(
        SourceContentSnapshot.of(raw).equals(SourceContentSnapshot.of(raw)),
      ).toBe(true);
    });

    it('frontmatter의 key 순서는 비교에 영향을 주지 않는다', () => {
      const reordered = SourceContentSnapshot.of({
        ...raw,
        frontmatter: { nested: { b: [1, 2], a: 1 }, title: 'Source note' },
      });

      expect(SourceContentSnapshot.of(raw).equals(reordered)).toBe(true);
    });

    it.each([
      { field: 'body', change: { body: '# Changed' } },
      { field: 'title', change: { title: 'Changed' } },
      { field: 'frontmatter', change: { frontmatter: { title: 'Changed' } } },
      { field: 'fingerprint', change: { fingerprint: 'fingerprint-2' } },
      { field: 'size', change: { size: 101 } },
    ])('$field가 다르면 다르다', ({ change }) => {
      expect(
        SourceContentSnapshot.of(raw).equals(
          SourceContentSnapshot.of({ ...raw, ...change }),
        ),
      ).toBe(false);
    });

    it('frontmatter 배열 순서가 다르면 다르다', () => {
      const reordered = SourceContentSnapshot.of({
        ...raw,
        frontmatter: { title: 'Source note', nested: { a: 1, b: [2, 1] } },
      });

      expect(SourceContentSnapshot.of(raw).equals(reordered)).toBe(false);
    });
  });
});
