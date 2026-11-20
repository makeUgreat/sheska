import { type Processor } from 'unified';

const ITEM = /^([ \t]*)([-*+]|(\d{1,9})[.)])(?:([ \t]+)(.*))?$/;
const THEMATIC_BREAK = /^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const FENCE_OPEN = /^[ \t]*(`{3,}|~{3,})/;
const FENCE_CLOSE = /^[ \t]*(`{3,}|~{3,})[ \t]*$/;
const BLANK = /^[ \t]*$/;
/** 줄 첫 칸에서 시작하면 앞 목록을 끝내는 block. */
const LIST_BREAKER = /^(#{1,6}(\s|$)|>|\|)/;
const TAB_STOP = 4;
/** 기호 뒤 공백이 이보다 길면 CommonMark는 내용을 기호 바로 뒤 한 칸에서 시작한다고 본다. */
const MAX_MARKER_GAP = 4;

type Level = {
  sourceColumn: number;
  sourceContentColumn: number;
  markerColumn: number;
  contentColumn: number;
};

type Fence = { mark: string; shift: number };

function columnAfter(text: string, start = 0): number {
  let column = start;
  for (const char of text) {
    column += char === '\t' ? TAB_STOP - (column % TAB_STOP) : 1;
  }
  return column;
}

function indentOf(line: string): string {
  return /^[ \t]*/.exec(line)![0];
}

function reindent(line: string, column: number): string {
  return ' '.repeat(Math.max(0, column)) + line.slice(indentOf(line).length);
}

/** 줄을 담는 항목은 그 줄보다 기호가 왼쪽에 있는 가장 깊은 항목이다. */
function ownerOf(levels: Level[], column: number): Level | undefined {
  for (let index = levels.length - 1; index >= 0; index -= 1) {
    if (levels[index].sourceColumn < column) return levels[index];
  }
  return levels[0];
}

function closesFence(line: string, fence: Fence): boolean {
  const mark = FENCE_CLOSE.exec(line)?.[1];
  return mark !== undefined && mark[0] === fence.mark[0] && mark.length >= fence.mark.length;
}

/**
 * Paragraph 바로 아래 줄은 CommonMark가 목록으로 읽지 않는 경우가 있다.
 * 1이 아닌 번호와 빈 항목은 paragraph를 끊지 못하고, 4칸 이상 들인 줄은 빈 줄 뒤에서 code block이 된다.
 */
function startsList(match: RegExpExecArray, column: number, after: 'blank' | 'text' | 'block'): boolean {
  if (column >= TAB_STOP) return after !== 'blank';
  if (after !== 'text') return true;

  const number = match[3];
  const empty = !match[5];
  return !empty && (number === undefined || Number(number) === 1);
}

/**
 * Obsidian은 탭, 공백 2칸, 공백 4칸을 섞어 들여 써도 들인 만큼 한 단계로 보여 준다.
 * CommonMark는 부모 내용이 시작하는 칸까지 들여야 자식으로 읽어서, 같은 단계가 형제·문단·code block으로 갈린다.
 * 목록 줄의 들여쓰기를 단계마다 부모 내용 칸에 맞춰 다시 쓴다. 부모 기호보다 더 들였으면 자식, 같으면 형제다.
 * 줄 수는 그대로 두어 node의 줄 번호가 원문과 맞는다.
 */
export function normalizeListIndent(body: string): string {
  const output: string[] = [];
  let levels: Level[] = [];
  let fence: Fence | null = null;
  let after: 'blank' | 'text' | 'block' = 'blank';

  const placeItem = (match: RegExpExecArray, column: number) => {
    while (levels.length > 0 && levels.at(-1)!.sourceColumn > column) levels.pop();
    if (levels.at(-1)?.sourceColumn === column) levels.pop();

    const [, indent, marker, , gap = '', text = ''] = match;
    const markerEnd = columnAfter(indent + marker);
    const gapWidth = columnAfter(gap, markerEnd) - markerEnd;
    const markerColumn = levels.at(-1)?.contentColumn ?? 0;
    levels.push({
      sourceColumn: column,
      sourceContentColumn: gapWidth >= 1 && gapWidth <= MAX_MARKER_GAP ? markerEnd + gapWidth : markerEnd + 1,
      markerColumn,
      contentColumn: markerColumn + marker.length + 1,
    });

    return ' '.repeat(markerColumn) + marker + (text ? ` ${text}` : '');
  };

  for (const line of body.split('\n')) {
    if (fence) {
      output.push(fence.shift === 0 ? line : reindent(line, columnAfter(indentOf(line)) + fence.shift));
      if (closesFence(line, fence)) fence = null;
      after = 'block';
      continue;
    }

    if (BLANK.test(line)) {
      output.push(line);
      after = 'blank';
      continue;
    }

    const column = columnAfter(indentOf(line));
    const item = THEMATIC_BREAK.test(line) ? null : ITEM.exec(line);
    const endsList = column === 0 && !item && (after === 'blank' || LIST_BREAKER.test(line) || FENCE_OPEN.test(line));
    if (endsList) levels = [];

    if (item && (levels.length > 0 || startsList(item, column, after))) {
      output.push(placeItem(item, column));
      after = 'text';
      continue;
    }

    const owner = column > 0 ? ownerOf(levels, column) : undefined;
    const target = owner ? Math.max(owner.contentColumn, column + owner.contentColumn - owner.sourceContentColumn) : column;
    output.push(target === column ? line : reindent(line, target));

    const fenceMark = FENCE_OPEN.exec(line)?.[1];
    if (fenceMark) fence = { mark: fenceMark, shift: target - column };
    after = fenceMark || LIST_BREAKER.test(line.trimStart()) ? 'block' : 'text';
  }

  return output.join('\n');
}

/** 정규화한 본문을 parser에 넘긴다. Renderer와 `parseOutline`이 같은 plugin 목록을 쓰므로 둘 다 같은 목록 구조를 얻는다. */
export function remarkListIndent(this: Processor) {
  const parse = this.parser;
  if (!parse) return;

  this.parser = (document, file) => parse(normalizeListIndent(document), file);
}
