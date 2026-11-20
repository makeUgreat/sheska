import { type Root, type RootContent } from 'mdast';
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../markdown-plugins';

function displayFlagsOf(body: string): boolean[] {
  const flags: boolean[] = [];
  const visit = (node: Root | RootContent) => {
    if (node.type === 'inlineMath') flags.push(String(node.data?.hProperties?.className).includes('math-display'));
    if ('children' in node) node.children.forEach(visit);
  };
  visit(parseMarkdown(body));
  return flags;
}

describe('remarkDisplayMath', () => {
  it('한 줄에서 닫은 `$$` 수식을 display로 표시한다', () => {
    expect(displayFlagsOf('$$a \\cdot b = |a| \\times |b|$$')).toEqual([true]);
  });

  it('목록 항목 문단에 이어진 `$$` 수식도 display로 표시한다', () => {
    const body = ['- 순위 결합', '\t\t- 점수 스케일 문제가 사라짐', '\t\t\t$$\\sum \\frac{1}{k + \\text{rank}}$$'].join('\n');

    expect(displayFlagsOf(body)).toEqual([true]);
  });

  it('`$` 하나로 감싼 수식은 inline으로 둔다', () => {
    expect(displayFlagsOf('관계 수는 $1:N$이고 비교 횟수는 $$N \\times M$$이다')).toEqual([false, true]);
  });
});
