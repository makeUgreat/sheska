import { type Root, type RootContent } from 'mdast';
import { parseWikiLinks } from '../lib/parse-wiki-links';

export const WIKI_LINK_ELEMENT = 'wiki-link';

export interface WikiLinkNode {
  type: 'wikiLink';
  data: {
    hName: typeof WIKI_LINK_ELEMENT;
    hProperties: { target: string; label: string };
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

/** `children`을 가진 mdast node는 모두 이 형태로 다룰 수 있다. */
type MarkdownParent = { children: RootContent[] };

function hasChildren(node: RootContent): node is RootContent & MarkdownParent {
  return 'children' in node;
}

function splitText(value: string): RootContent[] {
  return parseWikiLinks(value).map((token) =>
    token.kind === 'text'
      ? { type: 'text', value: token.value }
      : {
          type: 'wikiLink',
          data: {
            hName: WIKI_LINK_ELEMENT,
            hProperties: { target: token.target, label: token.label },
          },
        },
  );
}

function expandWikiLinks(parent: MarkdownParent) {
  parent.children = parent.children.flatMap((child) => {
    if (child.type === 'text') return splitText(child.value);
    if (hasChildren(child)) expandWikiLinks(child);
    return child;
  });
}

/**
 * Wiki link를 mdast text node 단계에서 바꾼다. 강조나 표처럼 어떤 inline 문법이
 * 감싸고 있든 같게 동작하고, 내용을 value로 들고 있는 code fence는 그대로 남는다.
 */
export function remarkWikiLink() {
  return (tree: Root) => expandWikiLinks(tree);
}

/**
 * 모든 wiki link는 API가 resolved target을 돌려주기 전까지 unresolved 상태다.
 * Vault에서 unresolved link는 오류가 아니라 정상 상태이므로 숨기지 않고 표시한다.
 */
export function WikiLink({ label }: { label?: string }) {
  return (
    <span
      title={`${label} — no note yet`}
      className="text-accent-strong underline decoration-dotted underline-offset-2"
    >
      {label}
    </span>
  );
}
