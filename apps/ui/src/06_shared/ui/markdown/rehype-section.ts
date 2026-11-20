import { type Element, type Root, type RootContent } from 'hast';

/** Vault `#`부터 `####`까지가 섹션을 연다. `#####` 아래 제목은 섹션 안의 글로 둔다. */
const SECTION_HEADING = /^h([1-4])$/;

type OpenSection = { level: number; section: Element };

function levelOf(node: RootContent): number | null {
  if (node.type !== 'element') return null;

  const match = SECTION_HEADING.exec(node.tagName);
  return match ? Number(match[1]) : null;
}

function wrapSections(tree: Root) {
  const top: RootContent[] = [];
  const open: OpenSection[] = [];

  for (const node of tree.children) {
    if (node.type === 'doctype') {
      top.push(node);
      continue;
    }

    const level = levelOf(node);
    if (level !== null) {
      while (open.length > 0 && open[open.length - 1].level >= level) open.pop();

      const section: Element = { type: 'element', tagName: 'section', properties: {}, children: [] };
      (open.at(-1)?.section.children ?? top).push(section);
      open.push({ level, section });
    }

    (open.at(-1)?.section.children ?? top).push(node);
  }

  tree.children = top;
}

/**
 * 제목부터 같은 단계 이하의 다음 제목 전까지를 `<section>`으로 묶는다. 첫 제목 앞의 글은 섹션 밖에 둔다.
 * 목차와 block anchor는 mdast를 읽으므로 hast에서 묶어야 두 곳의 판정이 바뀌지 않는다.
 */
export function rehypeSection() {
  return (tree: Root) => wrapSections(tree);
}
