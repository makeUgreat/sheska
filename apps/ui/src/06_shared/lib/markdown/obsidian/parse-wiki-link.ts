/** 표 안에서는 pipe를 `\|`로 적으므로 label 구분자로 같이 취급한다. */
const LABEL_SEPARATOR = /\\?\|/;

export type WikiLinkAnchor =
  | { kind: 'block'; id: string }
  | { kind: 'heading'; text: string };

/**
 * [[ 09_Knowledge/20260726145227 # ^c58057 | 라벨 ]]
 *           target                 anchor   label
 */
export interface WikiLink {
  target: string | null;
  anchor: WikiLinkAnchor | null;
  label: string;
}

function splitOnce(value: string, separator: string): [string, string] {
  const at = value.indexOf(separator);
  if (at < 0) return [value, ''];
  return [value.slice(0, at), value.slice(at + separator.length)];
}

function splitLabel(inner: string): [string, string | null] {
  const at = inner.search(LABEL_SEPARATOR);
  if (at < 0) return [inner, null];
  return [inner.slice(0, at), inner.slice(at).replace(LABEL_SEPARATOR, '')];
}

function readAnchor(value: string): WikiLinkAnchor | null {
  if (!value) return null;
  return value.startsWith('^')
    ? { kind: 'block', id: value.slice(1) }
    : { kind: 'heading', text: value };
}

export function writeAnchor(anchor: WikiLinkAnchor): string {
  return anchor.kind === 'block' ? `^${anchor.id}` : anchor.text;
}

/** `[[`와 `]]` 사이의 원문을 받는다. */
export function parseWikiLink(inner: string): WikiLink {
  const [location, display] = splitLabel(inner);
  const [rawTarget, rawAnchor] = splitOnce(location, '#');
  const target = rawTarget.trim() || null;
  const anchor = readAnchor(rawAnchor.trim());

  return {
    target,
    anchor,
    label: (display ?? target ?? (anchor && writeAnchor(anchor)) ?? '').trim(),
  };
}
