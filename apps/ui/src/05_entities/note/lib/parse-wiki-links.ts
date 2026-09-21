const WIKI_LINK = /(!?)\[\[([^\]]+)\]\]/g;

export type WikiLinkToken =
  | { kind: 'text'; value: string }
  | { kind: 'link'; target: string; label: string };

export function parseWikiLinks(text: string): WikiLinkToken[] {
  const tokens: WikiLinkToken[] = [];

  const pushText = (value: string) => {
    if (!value) return;
    const last = tokens.at(-1);
    if (last?.kind === 'text') last.value += value;
    else tokens.push({ kind: 'text', value });
  };

  let cursor = 0;

  for (const match of text.matchAll(WIKI_LINK)) {
    const [full, embed, inner] = match;
    const start = match.index ?? 0;
    pushText(text.slice(cursor, start));
    cursor = start + full.length;

    if (embed) {
      pushText(full);
      continue;
    }

    const [target, display] = inner.split('|');
    tokens.push({
      kind: 'link',
      target: target.trim(),
      label: (display ?? target.split('#')[0]).trim(),
    });
  }

  pushText(text.slice(cursor));
  return tokens;
}
