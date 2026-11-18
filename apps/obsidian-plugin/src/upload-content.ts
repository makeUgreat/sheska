import { getFrontMatterInfo, parseYaml, stringifyYaml } from 'obsidian';

const MASK_KEY = 'sheska-mask';
const DEFAULT_REPLACEMENT = '●●●';

export type PreparedUpload =
  | { ok: true; content: string; maskWords: string[] }
  | { ok: false; reason: string };

/**
 * `library-sync-13`, `library-sync-15`: 원문 단어와 vault 폴더 경로가 서버에 남지 않도록
 * 올리기 전에 내용을 바꾼다.
 */
export function prepareUploadContent(
  content: string,
  filePath: string,
): PreparedUpload {
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

  if (!isNonEmptyString(frontmatter.title)) {
    frontmatter.title = fileNameWithoutExtension(filePath);
  }

  const mask = createMask(replacements);
  return {
    ok: true,
    content: `---\n${stringifyYaml(maskValues(frontmatter, mask))}---\n${mask(body)}`,
    maskWords: [...replacements.keys()],
  };
}

export function containsMaskWord(text: string, maskWords: string[]): boolean {
  const lowered = text.toLowerCase();
  return maskWords.some((word) => lowered.includes(word));
}

function readReplacements(value: unknown): Map<string, string> | null {
  const replacements = new Map<string, string>();
  if (value === undefined || value === null) return replacements;
  if (typeof value !== 'object' || Array.isArray(value)) return null;

  for (const [word, replacement] of Object.entries(value)) {
    if (word.length === 0) continue;
    replacements.set(
      word.toLowerCase(),
      replacement === null || replacement === undefined || replacement === ''
        ? DEFAULT_REPLACEMENT
        : String(replacement),
    );
  }
  return replacements;
}

/** 긴 단어를 먼저 맞춰야 `Cert`와 `CertBear`가 같이 있을 때 `CertBear`가 통째로 바뀐다. */
function createMask(
  replacements: Map<string, string>,
): (text: string) => string {
  if (replacements.size === 0) return (text) => text;
  const pattern = new RegExp(
    [...replacements.keys()]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp)
      .join('|'),
    'giu',
  );
  return (text) =>
    text.replace(
      pattern,
      (match) => replacements.get(match.toLowerCase()) ?? DEFAULT_REPLACEMENT,
    );
}

function maskValues<T>(value: T, mask: (text: string) => string): T {
  if (typeof value === 'string') return mask(value) as T;
  if (Array.isArray(value)) {
    return value.map((item: unknown) => maskValues(item, mask)) as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, maskValues(item, mask)]),
    ) as T;
  }
  return value;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
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
