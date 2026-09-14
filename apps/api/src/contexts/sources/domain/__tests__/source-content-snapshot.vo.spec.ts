import { SourceContentSnapshot } from '@contexts/sources/domain';
import { describe, expect, it } from 'vitest';

describe('SourceContentSnapshot', () => {
  it('파싱된 본문과 전체 frontmatter를 보존한다', () => {
    const snapshot = SourceContentSnapshot.create({
      body: '# Source note',
      frontmatter: { title: 'Source note', custom: { enabled: true } },
      title: 'Source note',
      fingerprint: ' fingerprint-1 ',
      size: 100,
    });

    expect(snapshot.unpack()).toEqual({
      body: '# Source note',
      frontmatter: { title: 'Source note', custom: { enabled: true } },
      title: 'Source note',
      fingerprint: 'fingerprint-1',
      size: 100,
    });
  });

  it('빈 본문과 size 0을 허용한다', () => {
    const snapshot = SourceContentSnapshot.create({
      body: '',
      frontmatter: {},
      title: 'Notes/empty.md',
      fingerprint: 'empty-fingerprint',
      size: 0,
    });

    expect(snapshot.unpack().size).toBe(0);
  });

  it('fingerprint가 공백뿐이면 throw한다', () => {
    expect(() =>
      SourceContentSnapshot.create({
        body: '# Source note',
        frontmatter: {},
        title: 'Notes/source.md',
        fingerprint: ' ',
        size: 13,
      }),
    ).toThrow('Source fingerprint cannot be empty');
  });
});
