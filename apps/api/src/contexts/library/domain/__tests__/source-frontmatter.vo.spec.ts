import { describe, expect, it } from 'vitest';
import { SourceFrontmatter } from '../source-frontmatter.vo';

describe('SourceFrontmatter', () => {
  it('library.source-6: sheska가 YAML boolean true이면 동기화 대상이다', () => {
    expect(SourceFrontmatter.of({ sheska: true }).isSyncTarget()).toBe(true);
  });

  it.each([
    ['문자열 "true"', { sheska: 'true' }],
    ['yes', { sheska: 'yes' }],
    ['1', { sheska: 1 }],
    ['false', { sheska: false }],
    ['없음', {}],
  ])(
    'library.source-6: sheska가 %s이면 동기화 대상이 아니다',
    (_label, frontmatter) => {
      expect(SourceFrontmatter.of(frontmatter).isSyncTarget()).toBe(false);
    },
  );

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
