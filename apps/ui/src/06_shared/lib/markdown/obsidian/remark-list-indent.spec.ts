import { type Root, type RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../markdown-plugins';

type Item = [text: string, depth: number];

function itemsOf(body: string): Item[] {
  const items: Item[] = [];
  const visit = (node: Root | RootContent, depth: number) => {
    if (node.type === 'listItem') {
      const [first] = node.children;
      items.push([first ? toString(first) : '', depth]);
    }
    if (!('children' in node)) return;

    for (const child of node.children) visit(child, depth + (node.type === 'list' ? 1 : 0));
  };
  visit(parseMarkdown(body), 0);
  return items;
}

function codeOf(body: string): string[] {
  const values: string[] = [];
  const visit = (node: Root | RootContent) => {
    if (node.type === 'code') values.push(node.value);
    if ('children' in node) node.children.forEach(visit);
  };
  visit(parseMarkdown(body));
  return values;
}

function fenceOwnerOf(body: string): string | null {
  let owner: string | null = null;
  const visit = (node: Root | RootContent) => {
    if (node.type === 'listItem' && node.children.some((child) => child.type === 'code')) {
      owner = toString(node.children[0]);
    }
    if ('children' in node) node.children.forEach(visit);
  };
  visit(parseMarkdown(body));
  return owner;
}

describe('remarkListIndent', () => {
  it('공백 2칸, 탭, 공백 4칸으로 들인 자식은 모두 두 번째 단계다', () => {
    const body = ['- a', '  - b', '- c', '\t- d', '- e', '    - f'].join('\n');

    expect(itemsOf(body)).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 1],
      ['d', 2],
      ['e', 1],
      ['f', 2],
    ]);
  });

  it('부모 기호보다 덜 들인 줄은 그 폭 이하의 가장 가까운 단계로 돌아간다', () => {
    const body = ['- a', '\t\t- b', '\t- c'].join('\n');

    expect(itemsOf(body)).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 2],
    ]);
  });

  it('두 자리 번호 아래 3칸 들인 항목도 자식이다', () => {
    const body = ['10. 추적성', '   - 응답과 로그 연결'].join('\n');

    expect(itemsOf(body)).toEqual([
      ['추적성', 1],
      ['응답과 로그 연결', 2],
    ]);
  });

  it('번호 목록의 항목 글 아래 깊게 들인 항목은 그 번호의 자식이다', () => {
    const body = ['2. 두 가지 해법', '   2-1. 규칙 기반', '        - 규칙을 사람이 알 때'].join('\n');

    expect(itemsOf(body)).toEqual([
      ['두 가지 해법\n2-1. 규칙 기반', 1],
      ['규칙을 사람이 알 때', 2],
    ]);
  });

  it('code fence 바로 뒤 탭으로 들인 목록은 code block이 아니라 목록이다', () => {
    const body = ['```', 'x', '```', '\t- 확인', '\t\t- 기록'].join('\n');

    expect(codeOf(body)).toEqual(['x']);
    expect(itemsOf(body)).toEqual([
      ['확인', 1],
      ['기록', 2],
    ]);
  });

  it('항목 안 code fence는 항목과 함께 옮겨 그 항목에 남는다', () => {
    const body = ['- a', '\t- b', '', '\t  ```js', '\t  const x = 1', '\t  ```'].join('\n');

    expect(itemsOf(body)).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
    expect(fenceOwnerOf(body)).toBe('b');
  });

  it('code fence 안의 목록 모양 줄은 그대로 둔다', () => {
    expect(codeOf(['```', '\t- a', '  - b', '```'].join('\n'))).toEqual(['\t- a\n  - b']);
  });

  it('빈 줄 뒤 4칸 들인 줄은 code block으로 남는다', () => {
    expect(codeOf(['글', '', '    - a'].join('\n'))).toEqual(['- a']);
  });

  it('1이 아닌 번호는 문단을 끊지 않는다', () => {
    expect(itemsOf(['글', '2026. 연도'].join('\n'))).toEqual([]);
  });
});
