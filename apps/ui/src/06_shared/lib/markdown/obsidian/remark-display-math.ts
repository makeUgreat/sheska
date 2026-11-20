import { type Root, type RootContent } from 'mdast';
import { type Data, type Processor } from 'unified';

type FromMarkdownExtension = NonNullable<Data['fromMarkdownExtensions']>[number];

/** KaTeX는 이 class를 보고 display 모드로 그린다. */
const DISPLAY_MATH = ['language-math', 'math-display'];

function markDisplay(node: Root | RootContent, starts: Set<number>) {
  if (node.type === 'inlineMath' && starts.has(node.position?.start.offset ?? -1)) {
    node.data = { ...node.data, hProperties: { ...node.data?.hProperties, className: DISPLAY_MATH } };
  }

  if ('children' in node) node.children.forEach((child) => markDisplay(child, starts));
}

/**
 * Obsidian은 `$$`로 감싼 수식을 한 줄 안에서 닫아도 display 수식으로 그린다.
 * `remark-math`는 `$$`를 연 줄에서 닫으면 inline 수식으로 읽고, node에 `$`의 개수를 남기지 않는다.
 * 목록 들여쓰기를 고친 뒤에 parse하므로 원문 위치로 `$`를 셀 수 없어 token을 읽을 때 기록한다.
 */
export function remarkDisplayMath(this: Processor) {
  const doubleDollarStarts = new Set<number>();
  const extension: FromMarkdownExtension = {
    exit: {
      mathTextSequence(token) {
        if (token.end.offset - token.start.offset >= 2) doubleDollarStarts.add(token.start.offset);
      },
    },
    transforms: [
      (tree) => {
        markDisplay(tree, doubleDollarStarts);
        doubleDollarStarts.clear();
      },
    ],
  };

  const data = this.data();
  data.fromMarkdownExtensions = [...(data.fromMarkdownExtensions ?? []), extension];
}
