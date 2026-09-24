import { type Root, type RootContent } from 'mdast';
import remarkParse from 'remark-parse';
import { type PluggableList, unified } from 'unified';
import { OBSIDIAN_SYNTAX } from './obsidian';
import { remarkHeadingId } from './remark-heading-id';

/**
 * 렌더러와 목차가 이 목록 하나를 같이 써야 같은 트리를 얻는다.
 * Heading id는 wiki link가 label로 바뀐 뒤에 새겨야 slug가 화면 글자와 맞는다.
 */
export const MARKDOWN_PLUGINS: PluggableList = [
  ...OBSIDIAN_SYNTAX,
  remarkHeadingId,
];

const processor = unified().use(remarkParse).use(MARKDOWN_PLUGINS);

let lastParsed: { body: string; tree: Root } | null = null;

/**
 * 렌더러와 같은 plugin 목록으로 읽어 목차와 highlighter 판정이 화면과 맞게 한다.
 * 둘이 같은 본문을 연달아 읽으므로 마지막 결과를 재사용한다.
 * 트리를 호출한 곳끼리 나눠 쓰므로 한 곳에서 고치면 다른 곳이 바뀐 트리를 받는다.
 */
export function parseMarkdown(body: string): Root {
  if (lastParsed?.body === body) return lastParsed.tree;

  /** Plugin을 목록으로 받으면 unified가 tree 타입을 추론하지 못한다. */
  const tree = processor.runSync(processor.parse(body)) as Root;
  lastParsed = { body, tree };
  return tree;
}

export function hasCodeBlock(node: Root | RootContent): boolean {
  if (node.type === 'code') return true;
  return 'children' in node && node.children.some(hasCodeBlock);
}
