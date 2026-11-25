const CODE_BLOCK = /```[\s\S]*?```/g;
const EMBED = /!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)/g;
const WIKILINK = /\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;
const HEADING_LINE = /^#+ .*$/gm;
const WHITESPACE = /\s+/g;

export function toProseLength(body: string): number {
  const prose = body
    .replace(CODE_BLOCK, '')
    .replace(EMBED, '')
    .replace(WIKILINK, '$1')
    .replace(LINK, '$1')
    .replace(HEADING_LINE, '')
    .replace(WHITESPACE, ' ')
    .trim();

  return prose.length;
}
