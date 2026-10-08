import { describe, expect, it } from 'vitest';
import { SourceLinks } from '../source-links.vo';

describe('SourceLinks', () => {
  it('target의 앞뒤 공백을 떼고 같은 target은 처음 것만 남긴다', () => {
    const links = SourceLinks.of([
      { target: ' Other ', resolvedPath: 'Notes/Other.md' },
      { target: 'Other', resolvedPath: 'Notes/Elsewhere.md' },
      { target: 'Missing', resolvedPath: null },
    ]);

    expect(links.links).toEqual([
      { target: 'Other', resolvedPath: 'Notes/Other.md' },
      { target: 'Missing', resolvedPath: null },
    ]);
  });

  it('순서가 달라도 같은 링크면 같다', () => {
    const left = SourceLinks.of([
      { target: 'A', resolvedPath: 'Notes/A.md' },
      { target: 'B', resolvedPath: null },
    ]);
    const right = SourceLinks.of([
      { target: 'B', resolvedPath: null },
      { target: 'A', resolvedPath: 'Notes/A.md' },
    ]);

    expect(left.equals(right)).toBe(true);
  });

  it('해석 결과가 다르면 다르다', () => {
    const unresolved = SourceLinks.of([{ target: 'A', resolvedPath: null }]);
    const resolved = SourceLinks.of([
      { target: 'A', resolvedPath: 'Notes/A.md' },
    ]);

    expect(unresolved.equals(resolved)).toBe(false);
  });

  it('target이 비어 있으면 throw한다', () => {
    expect(() => SourceLinks.of([{ target: ' ', resolvedPath: null }])).toThrow(
      'Source link target cannot be empty',
    );
  });
});
