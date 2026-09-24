import { type Root, type RootContent } from 'mdast';

const MARKER_ONLY = /^\^([A-Za-z0-9-]+)$/;
const TRAILING_MARKER = /\s\^([A-Za-z0-9-]+)$/;

/** `^`는 fragment에 그대로 못 싣고 id는 숫자로 시작할 수 없다. */
export function blockAnchorId(id: string): string {
  return `block-${id}`;
}

type MarkdownParent = { type: string; children: RootContent[] };

function hasChildren(node: RootContent): node is RootContent & MarkdownParent {
  return 'children' in node;
}

function readAnchorId(node: RootContent | Root): string | null {
  const id = node.data?.hProperties?.id;
  return typeof id === 'string' ? id : null;
}

function clearAnchor(node: RootContent | Root) {
  node.data = { ...node.data, hProperties: {} };
}

function setBlockAnchor(node: RootContent | Root, id: string) {
  node.data = {
    ...node.data,
    hProperties: { ...node.data?.hProperties, id },
  };
}

function readMarker(children: RootContent[]): string | null {
  if (children.length !== 1) return null;
  const [only] = children;
  if (only.type !== 'text') return null;
  return MARKER_ONLY.exec(only.value.trim())?.[1] ?? null;
}

/** 표 바로 뒤에 붙은 표시는 GFM이 칸 하나짜리 행으로 읽는다. */
function readMarkerBlock(node: RootContent): string | null {
  if (node.type === 'paragraph') return readMarker(node.children);
  if (node.type === 'tableRow' && node.children.length === 1) {
    return readMarker(node.children[0].children);
  }
  return null;
}

function takeTrailingMarker(node: RootContent): string | null {
  if (node.type !== 'paragraph') return null;
  const last = node.children.at(-1);
  if (last?.type !== 'text') return null;

  const match = TRAILING_MARKER.exec(last.value);
  if (!match) return null;

  last.value = last.value.slice(0, match.index);
  return match[1];
}

/** Tight list의 문단은 element로 남지 않으므로 항목 자체가 표시를 받는다. */
function anchorTarget(
  parent: Root | (RootContent & MarkdownParent),
  node: RootContent,
): RootContent | Root {
  return parent.type === 'listItem' && node.type === 'paragraph'
    ? parent
    : node;
}

function markerOwner(
  parent: Root | (RootContent & MarkdownParent),
  previous: RootContent | undefined,
): RootContent | Root | undefined {
  if (parent.type === 'table') return parent;
  return previous && anchorTarget(parent, previous);
}

/** Callout 마지막 block에 붙은 표시는 인용 한 덩어리를 가리킨다. */
function hoistQuoteAnchor(quote: Root | (RootContent & MarkdownParent)) {
  const last = quote.children.at(-1);
  const id = last && readAnchorId(last);
  if (!last || !id) return;

  clearAnchor(last);
  setBlockAnchor(quote, id);
}

function applyBlockAnchors(parent: Root | (RootContent & MarkdownParent)) {
  const kept: RootContent[] = [];

  for (const child of parent.children) {
    if (hasChildren(child)) applyBlockAnchors(child);

    const marked = readMarkerBlock(child);
    if (marked) {
      const owner = markerOwner(parent, kept.at(-1));
      if (owner) setBlockAnchor(owner, blockAnchorId(marked));
      continue;
    }

    const trailing = takeTrailingMarker(child);
    if (trailing) {
      setBlockAnchor(anchorTarget(parent, child), blockAnchorId(trailing));
    }

    kept.push(child);
  }

  parent.children = kept;

  if (parent.type === 'blockquote') hoistQuoteAnchor(parent);
}

export function collectBlockAnchorIds(tree: Root): Set<string> {
  const ids = new Set<string>();

  const visit = (node: Root | RootContent) => {
    const id = readAnchorId(node);
    if (id) ids.add(id);
    if ('children' in node) node.children.forEach(visit);
  };

  visit(tree);
  return ids;
}

/**
 * Code fence 안의 `^id`는 표시가 아니라 코드다. Fence는 내용을 children이 아닌
 * value로 들고 있어 순회에서 빠지므로 따로 걸러 내지 않는다.
 */
export function remarkBlockAnchor() {
  return (tree: Root) => applyBlockAnchors(tree);
}
