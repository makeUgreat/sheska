import { type Blockquote, type Paragraph, type PhrasingContent, type Root, type RootContent } from 'mdast';

export const CALLOUT_ELEMENT = 'callout';

export const CALLOUT_TITLE_ELEMENT = 'callout-title';

const CALLOUT_MARKER = /^\[!([^\]]+)\]([-+]?)[ \t]*/;

/** hProperties는 소문자 이름의 값만 컴포넌트 prop까지 그대로 전달되므로 camelCase를 쓰지 않는다. */
type CalloutProperties = {
  type: string;
  fold?: 'collapsed' | 'expanded';
};

function readFold(sign: string): Pick<CalloutProperties, 'fold'> {
  switch (sign) {
    case '-':
      return { fold: 'collapsed' };
    case '+':
      return { fold: 'expanded' };
    default:
      return {};
  }
}

function takeMarker(paragraph: Paragraph): CalloutProperties | null {
  const first = paragraph.children[0];
  if (first?.type !== 'text') return null;

  const match = CALLOUT_MARKER.exec(first.value);
  if (!match) return null;

  first.value = first.value.slice(match[0].length);
  return { type: match[1].trim().toLowerCase(), ...readFold(match[2]) };
}

/** 제목 줄 바로 아래 줄은 빈 줄이 없으면 CommonMark가 같은 문단으로 읽는다. */
function splitFirstLine(children: PhrasingContent[]): [PhrasingContent[], PhrasingContent[]] {
  for (const [index, child] of children.entries()) {
    if (child.type === 'break') return [children.slice(0, index), children.slice(index + 1)];
    if (child.type !== 'text') continue;

    const lineEnd = child.value.indexOf('\n');
    if (lineEnd === -1) continue;

    const title: PhrasingContent = { type: 'text', value: child.value.slice(0, lineEnd) };
    const body: PhrasingContent = { type: 'text', value: child.value.slice(lineEnd + 1) };
    return [
      [...children.slice(0, index), title],
      [body, ...children.slice(index + 1)],
    ];
  }

  return [children, []];
}

function hasContent(children: PhrasingContent[]): boolean {
  return children.some((child) => child.type !== 'text' || child.value.trim() !== '');
}

function toCallout(quote: Blockquote) {
  const [first, ...rest] = quote.children;
  if (first?.type !== 'paragraph') return;

  const properties = takeMarker(first);
  if (!properties) return;

  const [title, body] = splitFirstLine(first.children);
  const titleNode: Paragraph = {
    type: 'paragraph',
    children: hasContent(title) ? title : [],
    data: { hName: CALLOUT_TITLE_ELEMENT, hProperties: properties },
  };
  const bodyNodes: Paragraph[] = hasContent(body) ? [{ type: 'paragraph', children: body }] : [];
  quote.data = { ...quote.data, hName: CALLOUT_ELEMENT, hProperties: { ...quote.data?.hProperties, ...properties } };
  quote.children = [titleNode, ...bodyNodes, ...rest];
}

function visit(node: Root | RootContent) {
  if (node.type === 'blockquote') toCallout(node);
  if ('children' in node) node.children.forEach(visit);
}

/**
 * 인용 첫 줄 맨 앞의 `[!type]`은 callout 표시다. 표시를 지우고 type과 접기 상태를 element에 남긴다.
 * 제목 줄은 본문 문단과 떼어 따로 둔다. 제목이 없어도 type label이 설 자리로 남긴다.
 */
export function remarkCallout() {
  return (tree: Root) => visit(tree);
}
