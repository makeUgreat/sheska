import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LINE_IN, lineDelay } from '../../line-in';
import { useCountUp } from '../model/use-count-up';

/** 오류는 accent와 섞이지 않게 amber를 쓴다. */
const TONE = {
  plain: 'text-on-surface',
  muted: 'text-on-surface-muted',
  error: 'text-terminal-output-error',
  success: 'text-terminal-output-success',
  directory: 'font-bold text-white',
} as const;

export function TerminalText({ tone = 'plain', children }: { tone?: keyof typeof TONE; children: ReactNode }) {
  return <p className={`whitespace-pre-wrap ${TONE[tone]}`}>{children}</p>;
}

/** 검색어와 같은 부분을 굵게 보인다. 대소문자는 가리지 않는다. */
export function TerminalHighlight({
  text,
  words,
  className = 'text-inherit',
}: {
  text: string;
  words: string[];
  /** 기본은 둘러싼 글자의 색을 그대로 쓴다. `<mark>`의 브라우저 기본색(검정)을 막는다. */
  className?: string;
}) {
  const terms = words.filter(Boolean).map(escapeRegExp);
  if (terms.length === 0) return text;

  const parts = text.split(new RegExp(`(${terms.join('|')})`, 'gi'));
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className={`bg-transparent font-bold ${className}`}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 세로선은 항목 높이 전체를 덮고, 마지막 항목에서는 첫 줄 가운데에서 멈춰 `└`가 된다. */
const VERTICAL_BRANCH =
  'before:absolute before:top-0 before:left-[calc(0.5ch-0.5px)] before:h-full before:border-l before:border-on-surface-muted/50 last:before:h-[0.5lh]';
const HORIZONTAL_BRANCH =
  'after:absolute after:top-[0.5lh] after:left-[calc(0.5ch-0.5px)] after:w-[2.5ch] after:border-t after:border-on-surface-muted/50';

export interface TerminalTreeItem {
  key: string;
  /** 가지 선 뒤에 오는 첫 줄 */
  head: ReactNode;
  /** 첫 줄 아래에 조금 더 들여 붙는 줄들 */
  details?: ReactNode[];
}

/**
 * tree 명령처럼 `├──`, `└──` 모양의 선으로 묶는다.
 * 선은 글자가 아니라 테두리라서 줄바꿈된 줄과 줄 사이에서도 끊기지 않고, 화면 낭독기에도 읽히지 않는다.
 */
export function TerminalTree({ root, items, footer }: { root: ReactNode; items: TerminalTreeItem[]; footer?: ReactNode }) {
  return (
    <div>
      <p className={LINE_IN}>{root}</p>
      <ul>
        {items.map((item, index) => (
          <li
            key={item.key}
            className={`relative pl-[4ch] ${VERTICAL_BRANCH} ${HORIZONTAL_BRANCH} ${LINE_IN}`}
            style={lineDelay(index + 1)}
          >
            <p className="break-words">{item.head}</p>
            {item.details?.map((detail, detailIndex) => (
              <p key={detailIndex} className="break-words pl-[2ch] text-on-surface-muted">
                {detail}
              </p>
            ))}
          </li>
        ))}
      </ul>
      {footer && (
        <p className={`mt-[0.5lh] text-on-surface-muted ${LINE_IN}`} style={lineDelay(items.length + 1)}>
          {footer}
        </p>
      )}
    </div>
  );
}

export function TerminalTreeRoot({ label, note }: { label: string; note?: ReactNode }) {
  return (
    <>
      <span className="font-bold text-white">{label}</span>
      {note && <span className="ml-[2ch] text-on-surface-muted">{note}</span>}
    </>
  );
}

/** 목록 한 줄. 제목 링크 뒤에 날짜를 붙인다. */
export function TerminalEntryLink({ title, to, date, highlight = [] }: { title: string; to: string; date?: string; highlight?: string[] }) {
  return (
    <>
      <Link to={to} className="text-primary underline decoration-primary/40 underline-offset-[3px] hover:decoration-primary">
        <TerminalHighlight text={title} words={highlight} />
      </Link>
      {date && (
        <span className="whitespace-nowrap text-on-surface-muted">
          {' · '}
          {date}
        </span>
      )}
    </>
  );
}

const COUNT_UP_MS = 450;
const METER_FILL_MS = 600;
const METER_COLUMNS = 20;
const METER_ROWS = [0, 1, 2, 3];
const BOTTOM_ROW = 3;
/** 단위는 1000 = 1em. 높이는 JetBrains Mono의 cap height라 막대가 옆 숫자와 같은 키로 기준선에 선다. */
const DOT_PITCH = 300;
const DOT_RADIUS = 62;
const METER_HEIGHT = 730;
const ROW_GAP = (METER_HEIGHT - DOT_RADIUS * 2) / BOTTOM_ROW;
const METER_WIDTH = METER_COLUMNS * DOT_PITCH;

/** 0부터 값까지 숫자를 올린다. 올라가는 숫자는 화면 낭독기에 숨기고 최종 값만 읽힌다. */
export function TerminalCountUp({ value, format }: { value: number; format: (count: number) => string }) {
  const shown = useCountUp(value, COUNT_UP_MS);

  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}

/** 점 막대와 퍼센트를 함께 채운다. 막대는 장식이라 화면 낭독기에는 퍼센트만 읽힌다. */
export function TerminalMeter({ percent }: { percent: number }) {
  const shown = useCountUp(percent, METER_FILL_MS);
  const litColumns = Math.round((shown / 100) * METER_COLUMNS);

  return (
    <>
      <span aria-hidden="true" className="whitespace-nowrap">
        <DotBar litColumns={litColumns} /> {shown}%
      </span>
      <span className="sr-only">{percent}%</span>
    </>
  );
}

/** 점자 ⣿처럼 열마다 점 4개를 세운다. 빈 열은 바닥 점만 남겨 막대 길이를 보인다. */
function DotBar({ litColumns }: { litColumns: number }) {
  const dots = Array.from({ length: METER_COLUMNS }, (_, column) => {
    const lit = column < litColumns;
    const rows = lit ? METER_ROWS : [BOTTOM_ROW];

    return rows.map((row) => (
      <circle
        key={`${column}-${row}`}
        cx={DOT_PITCH * column + DOT_PITCH / 2}
        cy={DOT_RADIUS + ROW_GAP * row}
        r={DOT_RADIUS}
        className={lit ? 'fill-primary' : 'fill-on-surface-muted/50'}
      />
    ));
  });

  return (
    <svg
      viewBox={`0 0 ${METER_WIDTH} ${METER_HEIGHT}`}
      className="inline-block h-[1cap] align-baseline"
      style={{ width: `${METER_WIDTH / 1000}em` }}
    >
      {dots}
    </svg>
  );
}
