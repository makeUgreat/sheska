import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DOMAIN_DIR = new URL('../docs/ko/domain/', import.meta.url).pathname;
const write = process.argv.includes('--write');

function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\- _]/gu, '')
    .replaceAll(' ', '-');
}

function ruleSentence(lines, from) {
  let i = from;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  const sentence = [];
  while (
    i < lines.length &&
    lines[i].trim() !== '' &&
    !/^(- |\||#|```)/.test(lines[i])
  ) {
    sentence.push(lines[i].trim());
    i += 1;
  }
  return sentence.join(' ');
}

function withRuleTables(text, context, problems) {
  const lines = text.split('\n');
  const out = [];
  const sectionNames = new Set();
  let i = 0;
  while (i < lines.length) {
    out.push(lines[i]);
    if (!/^## .*규칙( \(.*\))?$/.test(lines[i])) {
      i += 1;
      continue;
    }
    let end = i + 1;
    while (end < lines.length && !lines[end].startsWith('## ')) end += 1;
    const section = lines.slice(i + 1, end);
    const name = /^## .+ 규칙 \(([a-z][A-Za-z]*)\)$/.exec(lines[i])?.[1];
    if (!name) {
      problems.push(`섹션 이름이 없습니다: ${lines[i]}`);
    } else if (sectionNames.has(name)) {
      problems.push(`섹션 이름이 겹칩니다: ${lines[i]}`);
    } else {
      sectionNames.add(name);
      for (const line of section) {
        const id = /^### (\S+) /.exec(line)?.[1];
        if (id && !new RegExp(`^${context}\\.${name}-[1-9]\\d*$`).test(id)) {
          problems.push(`ID가 섹션과 맞지 않습니다: ${line}`);
        }
      }
    }
    const firstRule = section.findIndex((line) => line.startsWith('### '));
    if (firstRule === -1) {
      out.push(...section);
      i = end;
      continue;
    }
    const lead = section
      .slice(0, firstRule)
      .filter((line) => !line.startsWith('|'));
    while (lead.length > 0 && lead.at(-1).trim() === '') lead.pop();
    const rows = section.flatMap((line, k) => {
      const match = /^### (\S+) .+$/.exec(line);
      if (!match) return [];
      const heading = line.slice(4);
      return [
        `| [${match[1]}](#${slug(heading)}) | ${ruleSentence(section, k + 1)} |`,
      ];
    });
    out.push(
      ...lead,
      '',
      '| ID | 규칙 |',
      '|---|---|',
      ...rows,
      '',
      ...section.slice(firstRule),
    );
    i = end;
  }
  return out.join('\n');
}

const stale = [];
const problems = [];
for (const name of readdirSync(DOMAIN_DIR).filter((file) =>
  file.endsWith('.md'),
)) {
  const path = join(DOMAIN_DIR, name);
  const text = readFileSync(path, 'utf8');
  const fileProblems = [];
  const expected = withRuleTables(text, name.slice(0, -3), fileProblems);
  problems.push(
    ...fileProblems.map((problem) => `- docs/ko/domain/${name}: ${problem}`),
  );
  if (expected === text) continue;
  if (write) writeFileSync(path, expected);
  else stale.push(`docs/ko/domain/${name}`);
}

if (problems.length > 0) {
  console.error('규칙 ID가 규칙 ID 규칙을 따르지 않습니다.');
  for (const problem of problems) console.error(problem);
  process.exit(1);
}

if (stale.length > 0) {
  console.error(
    '규칙 요약 표가 규칙 본문과 다릅니다. pnpm docs:rule-tables를 실행하고 커밋하세요.',
  );
  for (const file of stale) console.error(`- ${file}`);
  process.exit(1);
}
