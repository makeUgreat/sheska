import { describe, expect, it } from 'vitest';
import { SourceFrontmatter } from '../source-frontmatter.vo';

describe('SourceFrontmatter', () => {
  it('library.source-6: sheska가 YAML boolean true이면 동기화 대상이다', () => {
    expect(SourceFrontmatter.of({ sheska: true }).optsIntoSync()).toBe(true);
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
      expect(SourceFrontmatter.of(frontmatter).optsIntoSync()).toBe(false);
    },
  );
});
