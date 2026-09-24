import { describe, it, expect } from 'vitest';
import { type Root, type RootContent } from 'mdast';
import { parseMarkdown } from '../markdown-plugins';

function collect(node: Root | RootContent, type: string): RootContent[] {
  const own = node.type === type ? [node as RootContent] : [];
  const children: RootContent[] = 'children' in node ? node.children : [];
  return [...own, ...children.flatMap((child) => collect(child, type))];
}

function labels(body: string): string[] {
  return collect(parseMarkdown(body), 'wikiLink').map((node) =>
    node.type === 'wikiLink' ? node.label : '',
  );
}

describe('remarkWikiLink', () => {
  it('여러 링크를 순서대로 읽는다', () => {
    expect(labels('[[A]] and [[B]]')).toEqual(['A', 'B']);
  });

  it('embed 링크는 wiki link로 읽지 않고 원문으로 남긴다', () => {
    const tree = parseMarkdown('before ![[a.png]] after');

    expect(labels('before ![[a.png]] after')).toEqual([]);
    expect(
      collect(tree, 'text')
        .map((node) => ('value' in node ? node.value : ''))
        .join(''),
    ).toBe('before ![[a.png]] after');
  });

  it('줄을 넘기는 괄호는 wiki link로 읽지 않는다', () => {
    expect(labels('[[a\nb]]')).toEqual([]);
  });

  it('빈 괄호는 wiki link로 읽지 않는다', () => {
    expect(labels('[[]]')).toEqual([]);
  });

  it('inline code 안의 wiki link 문법은 원문 그대로 둔다', () => {
    expect(labels('`[[FSD]]`')).toEqual([]);
  });
});
