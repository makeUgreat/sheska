export function extractFrontmatterTitle(content: string): string | null {
  if (!content.startsWith('---')) return null;
  const afterOpen = content.indexOf('\n');
  if (afterOpen === -1) return null;
  const closeIndex = content.indexOf('\n---', afterOpen);
  if (closeIndex === -1) return null;
  const frontmatter = content.slice(afterOpen + 1, closeIndex);
  for (const line of frontmatter.split('\n')) {
    const match = line.match(/^title:\s*(.+)$/);
    if (match) return match[1].trim();
  }
  return null;
}
