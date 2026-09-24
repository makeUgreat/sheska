import { type Heading, type Root, type RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { slugify } from '../slugify';

export function isHeading(node: RootContent): node is Heading {
  return node.type === 'heading';
}

export function headingText(node: Heading): string {
  return toString(node).trim();
}

export function readHeadingId(node: Heading): string | null {
  const id = node.data?.hProperties?.id;
  return typeof id === 'string' ? id : null;
}

/**
 * 목차와 렌더링이 같은 트리에서 같은 id를 얻도록 heading node에 id를 새긴다.
 * 인용문이나 목록 안의 heading은 문서 구조가 아니므로 최상위 heading만 받는다.
 * 같은 slug가 여러 번 나오면 id가 겹쳐 목차 링크가 모두 첫 heading으로 가므로 source line을 붙여 구분한다.
 */
export function remarkHeadingId() {
  return (tree: Root) => {
    const headings = tree.children
      .filter(isHeading)
      .map((node) => ({ node, slug: slugify(headingText(node)) }))
      .filter(({ slug }) => slug);

    const occurrences = new Map<string, number>();
    for (const { slug } of headings) {
      occurrences.set(slug, (occurrences.get(slug) ?? 0) + 1);
    }

    for (const { node, slug } of headings) {
      const isDuplicated = (occurrences.get(slug) ?? 0) > 1;
      const line = node.position?.start.line ?? 0;
      node.data = {
        ...node.data,
        hProperties: {
          ...node.data?.hProperties,
          id: isDuplicated ? `${slug}-${line}` : slug,
        },
      };
    }
  };
}
