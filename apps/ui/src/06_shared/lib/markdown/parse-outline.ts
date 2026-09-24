import { parseMarkdown } from './markdown-plugins';
import { headingText, isHeading, readHeadingId } from './remark-heading-id';

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

/** Id를 여기서 다시 만들면 목차 링크가 렌더된 heading과 어긋날 수 있어, `remarkHeadingId`가 새긴 값을 읽는다. */
export function parseOutline(body: string): Heading[] {
  return parseMarkdown(body).children.flatMap((node) => {
    if (!isHeading(node)) return [];
    const id = readHeadingId(node);
    return id ? [{ depth: node.depth, text: headingText(node), id }] : [];
  });
}
