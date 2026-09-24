import { type PhrasingContent, type Root, type RootContent } from 'mdast';
import {
  parseWikiLink,
  writeAnchor,
  type WikiLink,
  type WikiLinkAnchor,
} from './parse-wiki-link';
import { blockAnchorId, collectBlockAnchorIds } from './remark-block-anchor';

export const WIKI_LINK_ELEMENT = 'wiki-link';

const WIKI_LINK = /(!?)\[\[([^\]\n]+)\]\]/g;

export interface WikiLinkNode extends WikiLink {
  type: 'wikiLink';
  /** 목차처럼 글자만 읽는 곳에서 wiki link가 label로 읽히게 한다. */
  value: string;
  data: {
    hName: typeof WIKI_LINK_ELEMENT;
    hProperties: Record<string, string>;
  };
}

declare module 'mdast' {
  interface RootContentMap {
    wikiLink: WikiLinkNode;
  }
  interface PhrasingContentMap {
    wikiLink: WikiLinkNode;
  }
}

function isMissingBlock(
  target: string | null,
  anchor: WikiLinkAnchor,
  anchors: Set<string>,
): boolean {
  return (
    !target && anchor.kind === 'block' && !anchors.has(blockAnchorId(anchor.id))
  );
}

function readAnchorProperty(
  { target, anchor }: WikiLink,
  anchors: Set<string>,
): string | null {
  if (!anchor) return null;
  return isMissingBlock(target, anchor, anchors) ? null : writeAnchor(anchor);
}

function createWikiLink(inner: string, anchors: Set<string>): WikiLinkNode {
  const link = parseWikiLink(inner);
  const anchor = readAnchorProperty(link, anchors);

  return {
    type: 'wikiLink',
    ...link,
    value: link.label,
    data: {
      hName: WIKI_LINK_ELEMENT,
      hProperties: {
        ...(link.target ? { target: link.target } : {}),
        ...(anchor ? { anchor } : {}),
        label: link.label,
      },
    },
  };
}

/** Embed(`![[...]]`)는 아직 그리지 않으므로 원문 글자로 남긴다. */
function splitText(value: string, anchors: Set<string>): PhrasingContent[] {
  const nodes: PhrasingContent[] = [];
  let cursor = 0;

  for (const match of value.matchAll(WIKI_LINK)) {
    const [whole, embed, inner] = match;
    if (embed) continue;

    if (match.index > cursor) {
      nodes.push({ type: 'text', value: value.slice(cursor, match.index) });
    }
    nodes.push(createWikiLink(inner, anchors));
    cursor = match.index + whole.length;
  }

  if (cursor < value.length) {
    nodes.push({ type: 'text', value: value.slice(cursor) });
  }
  return nodes;
}

type MarkdownParent = { children: RootContent[] };

function expandWikiLinks(parent: MarkdownParent, anchors: Set<string>) {
  parent.children = parent.children.flatMap<RootContent>((child) => {
    if (child.type === 'text') return splitText(child.value, anchors);
    if ('children' in child) expandWikiLinks(child, anchors);
    return child;
  });
}

/**
 * Wiki link를 mdast text node 단계에서 바꾼다. 강조나 표처럼 어떤 inline 문법이
 * 감싸고 있든 같게 동작하고, 내용을 value로 들고 있는 code는 그대로 남는다.
 * Label 안의 `*`, `~~`, URL은 parser가 먼저 다른 node로 쪼개므로 link로 읽지 못한다.
 * Vault에서 드문 경우라 문법 확장의 비용을 들이지 않는다.
 */
export function remarkWikiLink() {
  return (tree: Root) => expandWikiLinks(tree, collectBlockAnchorIds(tree));
}
