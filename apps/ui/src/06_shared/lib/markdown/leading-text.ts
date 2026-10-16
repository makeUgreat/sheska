import { toString } from 'mdast-util-to-string';
import { parseMarkdown } from './markdown-plugins';

/** 미리보기는 렌더러와 같은 트리에서 문단만 읽어, wiki link는 label로 보이고 heading과 code는 빠진다. */
export function leadingText(body: string, maxLength: number): string {
  let text = '';

  for (const node of parseMarkdown(body).children) {
    if (node.type !== 'paragraph') continue;
    const paragraph = toString(node).trim();
    if (!paragraph) continue;

    text = text ? `${text} ${paragraph}` : paragraph;
    if (text.length >= maxLength) break;
  }

  return text.length > maxLength
    ? `${text.slice(0, maxLength).trimEnd()}…`
    : text;
}
