import { getFrontMatterInfo, parseYaml, stringifyYaml } from 'obsidian';

const MASK_KEY = 'sheska-mask';
const DEFAULT_REPLACEMENT = '●●●';

export interface ImageLink {
  /** 본문에 적힌 embed 원문. 예: `![[a.png|300]]` */
  original: string;
  target: string;
}

export type PreparedUpload = { ok: true; content: string } | { ok: false; reason: string };

/**
 * `library-sync-13`, `library-sync-15`: 원문 단어와 vault 폴더 경로가 서버에 남지 않도록
 * 올리기 전에 내용을 바꾼다.
 */
export function prepareUploadContent(content: string, filePath: string, imageLinks: ImageLink[] = []): PreparedUpload {
  const info = getFrontMatterInfo(content);
  const frontmatter = info.exists ? toRecord(parseYaml(info.frontmatter)) : {};
  const body = info.exists ? content.slice(info.contentStart) : content;

  const replacements = readReplacements(frontmatter[MASK_KEY]);
  if (!replacements) {
    return {
      ok: false,
      reason: `${MASK_KEY} must be a mapping of word: replacement`,
    };
  }
  delete frontmatter[MASK_KEY];

  const maskedAddress = findMaskedAddress(body, imageLinks, [...replacements.keys()]);
  if (maskedAddress) {
    return {
      ok: false,
      reason: `change the link ${maskedAddress}, its address contains a masked word`,
    };
  }

  if (!isNonEmptyString(frontmatter.title)) {
    frontmatter.title = fileNameWithoutExtension(filePath);
  }

  const mask = createMask(replacements);
  return {
    ok: true,
    content: `---\n${stringifyYaml(maskValues(frontmatter, mask))}---\n${rewriteImageLinks(body, imageLinks, mask)}`,
  };
}

/**
 * `library-sync-12`: 링크를 먼저 사설 영역 문자로 감춘 뒤 마스킹한다.
 * 그대로 마스킹하면 `cafe` 같은 단어가 해시 안의 글자를 바꿔 링크가 깨진다.
 */
function rewriteImageLinks(body: string, imageLinks: ImageLink[], mask: (text: string) => string): string {
  const tokens = imageLinks.map((link, index) => ({
    ...link,
    token: `\uE000${String.fromCharCode(0xe001 + index)}\uE000`,
  }));
  let rewritten = body;
  for (const { original, token } of tokens) {
    rewritten = rewritten.split(original).join(token);
  }
  rewritten = mask(rewritten);
  for (const { original, target, token } of tokens) {
    rewritten = rewritten.split(token).join(`![${mask(altOf(original))}](${target})`);
  }
  return rewritten;
}

const FENCED_CODE = /^(```|~~~)[\s\S]*?^\1/gm;
const INLINE_CODE = /`[^`\n]+`/g;
const LINK_TARGET = /\]\(\s*<?([^)\s>]+)/g;
const REFERENCE_DEFINITION = /^ {0,3}\[[^\]]+\]:\s*<?([^\s>]+)/gm;
const URL_LITERAL = /[a-z][a-z\d+.-]*:\/\/[^\s<>()[\]]+/gi;

/**
 * `library-sync-14`: 링크 주소를 마스킹하면 링크가 깨지고, 두면 단어가 드러난다.
 * 사용자가 고칠 수 있도록 보내지 않는다. 해시 이름으로 바꿀 vault 이미지와 코드는 링크가 아니라 제외한다.
 */
function findMaskedAddress(body: string, imageLinks: ImageLink[], maskWords: string[]): string | undefined {
  if (maskWords.length === 0) return undefined;
  let linkText = body;
  for (const { original } of imageLinks) {
    linkText = linkText.split(original).join(' ');
  }
  linkText = linkText.replace(FENCED_CODE, ' ').replace(INLINE_CODE, ' ');

  const addresses = [...linkText.matchAll(LINK_TARGET), ...linkText.matchAll(REFERENCE_DEFINITION), ...linkText.matchAll(URL_LITERAL)].map(
    (match) => match[1] ?? match[0],
  );
  return addresses.find((address) => {
    const lowered = address.toLowerCase();
    return maskWords.some((word) => lowered.includes(word));
  });
}

const MARKDOWN_EMBED = /^!\[([^\]]*)\]\(/;
const WIKI_EMBED = /^!\[\[([^\]]*)\]\]$/;
const OBSIDIAN_SIZE = /^\d+(?:x\d+)?$/;

/** wiki embed의 `|300`은 UI가 alt 끝에서 읽는 크기 문법 `![|300](…)`으로 옮긴다. */
function altOf(original: string): string {
  const markdown = MARKDOWN_EMBED.exec(original);
  if (markdown) return markdown[1];
  const wiki = WIKI_EMBED.exec(original);
  if (!wiki) return '';
  const separator = wiki[1].indexOf('|');
  if (separator === -1) return '';
  const display = wiki[1].slice(separator + 1);
  return OBSIDIAN_SIZE.test(display) ? `|${display}` : display;
}

function readReplacements(value: unknown): Map<string, string> | null {
  const replacements = new Map<string, string>();
  if (value === undefined || value === null) return replacements;
  if (typeof value !== 'object' || Array.isArray(value)) return null;

  for (const [word, replacement] of Object.entries(value)) {
    if (word.length === 0) continue;
    replacements.set(
      word.toLowerCase(),
      replacement === null || replacement === undefined || replacement === '' ? DEFAULT_REPLACEMENT : String(replacement),
    );
  }
  return replacements;
}

/** 긴 단어를 먼저 맞춰야 `Cert`와 `CertBear`가 같이 있을 때 `CertBear`가 통째로 바뀐다. */
function createMask(replacements: Map<string, string>): (text: string) => string {
  if (replacements.size === 0) return (text) => text;
  const pattern = new RegExp(
    [...replacements.keys()]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join('|'),
    'giu',
  );
  return (text) => text.replace(pattern, (match) => replacements.get(match.toLowerCase()) ?? DEFAULT_REPLACEMENT);
}

function maskValues<T>(value: T, mask: (text: string) => string): T {
  if (typeof value === 'string') return mask(value) as T;
  if (Array.isArray(value)) {
    return value.map((item: unknown) => maskValues(item, mask)) as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, maskValues(item, mask)])) as T;
  }
  return value;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function fileNameWithoutExtension(filePath: string): string {
  const fileName = filePath.slice(filePath.lastIndexOf('/') + 1);
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
