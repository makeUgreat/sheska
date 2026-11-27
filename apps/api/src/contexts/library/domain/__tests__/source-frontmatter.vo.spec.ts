import { describe, expect, it } from 'vitest';
import { SourceFrontmatter } from '../source-frontmatter.vo';

describe('SourceFrontmatter', () => {
  // nocap: library-source-6
  it('sheska가 YAML boolean true이면 frontmatter로 읽는다', () => {
    expect(SourceFrontmatter.parse({ sheska: true, title: 'Retry' }).unpack()).toEqual({ sheska: true, title: 'Retry' });
  });

  // nocap: library-source-6
  it.each([
    ['문자열 "true"', { sheska: 'true' }],
    ['yes', { sheska: 'yes' }],
    ['1', { sheska: 1 }],
    ['false', { sheska: false }],
    ['없음', {}],
  ])('sheska가 %s이면 호출자가 고칠 오류로 거부한다', (_label, frontmatter) => {
    expect(() => SourceFrontmatter.parse(frontmatter)).toThrow(
      expect.objectContaining({
        kind: 'validation_failed',
        code: 'source.not_sync_target',
        details: { fields: [{ path: 'frontmatter.sheska', messages: ['must be true'] }] },
      }),
    );
  });

  it('중첩된 객체까지 키 순서와 무관하게 비교한다', () => {
    const current = SourceFrontmatter.of({
      custom: { b: 1, a: [{ y: 1, x: 2 }] },
    });
    const next = SourceFrontmatter.of({
      custom: { a: [{ x: 2, y: 1 }], b: 1 },
    });

    expect(current.equals(next)).toBe(true);
  });

  it('배열 순서가 다르면 다른 frontmatter다', () => {
    const current = SourceFrontmatter.of({ tags: ['a', 'b'] });
    const next = SourceFrontmatter.of({ tags: ['b', 'a'] });

    expect(current.equals(next)).toBe(false);
  });
});
