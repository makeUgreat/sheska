import { slugify } from './slugify';

const HEADING = /^(#{1,3})\s+(.+?)\s*$/;
const FENCE = /^\s*(```|~~~)/;

export interface Heading {
  depth: number;
  text: string;
  id: string;
  line: number;
}

export function parseOutline(body: string): Heading[] {
  const found: Omit<Heading, 'id'>[] = [];
  let fenced = false;

  body.split('\n').forEach((line, index) => {
    if (FENCE.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;

    const match = HEADING.exec(line);
    if (match) {
      found.push({
        depth: match[1].length,
        text: match[2],
        line: index + 1,
      });
    }
  });

  const occurrences = new Map<string, number>();
  for (const heading of found) {
    const slug = slugify(heading.text);
    occurrences.set(slug, (occurrences.get(slug) ?? 0) + 1);
  }

  return found.map((heading) => {
    const slug = slugify(heading.text);
    const isDuplicated = (occurrences.get(slug) ?? 0) > 1;
    return { ...heading, id: isDuplicated ? `${slug}-${heading.line}` : slug };
  });
}
