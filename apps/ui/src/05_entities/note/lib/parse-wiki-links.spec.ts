import { describe, it, expect } from 'vitest';
import { parseWikiLinks } from './parse-wiki-links';

describe('parseWikiLinks', () => {
  it('링크가 없으면 텍스트 토큰 하나만 만든다', () => {
    expect(parseWikiLinks('plain sentence')).toEqual([
      { kind: 'text', value: 'plain sentence' },
    ]);
  });

  it('링크 앞뒤 텍스트를 분리해 토큰으로 만든다', () => {
    expect(parseWikiLinks('see [[FSD]] first')).toEqual([
      { kind: 'text', value: 'see ' },
      { kind: 'link', target: 'FSD', label: 'FSD' },
      { kind: 'text', value: ' first' },
    ]);
  });

  it('pipe가 있으면 뒤쪽 표기를 label로 사용한다', () => {
    expect(parseWikiLinks('[[feature-sliced-design|FSD]]')).toEqual([
      { kind: 'link', target: 'feature-sliced-design', label: 'FSD' },
    ]);
  });

  it('heading anchor는 label에서 제외한다', () => {
    expect(parseWikiLinks('[[FSD#레이어 모델]]')).toEqual([
      { kind: 'link', target: 'FSD#레이어 모델', label: 'FSD' },
    ]);
  });

  it('embed 링크는 원문 텍스트로 남긴다', () => {
    expect(parseWikiLinks('![[diagram.png]]')).toEqual([
      { kind: 'text', value: '![[diagram.png]]' },
    ]);
  });

  it('embed 링크는 주변 텍스트와 하나의 토큰으로 합친다', () => {
    expect(parseWikiLinks('before ![[a.png]] after')).toEqual([
      { kind: 'text', value: 'before ![[a.png]] after' },
    ]);
  });

  it('여러 링크를 순서대로 토큰으로 만든다', () => {
    expect(parseWikiLinks('[[A]] and [[B]]')).toEqual([
      { kind: 'link', target: 'A', label: 'A' },
      { kind: 'text', value: ' and ' },
      { kind: 'link', target: 'B', label: 'B' },
    ]);
  });
});
