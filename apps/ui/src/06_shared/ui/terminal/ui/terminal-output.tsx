import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
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

const BRANCH = 'flex-none whitespace-pre text-on-surface-muted/50';
const LINE_IN = 'animate-terminal-line-in motion-reduce:animate-none';
const LINE_STAGGER_MS = 24;
/** 긴 목록도 400ms 안에 다 보이게 이 줄부터는 더 늦추지 않는다. */
const LAST_STAGGERED_LINE = 10;

function lineDelay(index: number) {
  return { animationDelay: `${Math.min(index, LAST_STAGGERED_LINE) * LINE_STAGGER_MS}ms` };
}

export interface TerminalTreeItem {
  key: string;
  /** 가지 기호 뒤에 오는 첫 줄 */
  head: ReactNode;
  /** 첫 줄 아래에 가지에 맞춰 붙는 둘째 줄 */
  detail?: ReactNode;
}

/**
 * tree 명령처럼 `├──`, `└──`로 묶는다. 가지 기호는 장식이라 화면 낭독기에는 숨긴다.
 * 긴 제목이 줄바꿈되어도 가지 기호 오른쪽에 맞춘다.
 */
export function TerminalTree({ root, items, footer }: { root: ReactNode; items: TerminalTreeItem[]; footer?: ReactNode }) {
  return (
    <div>
      <p className={LINE_IN}>{root}</p>
      <ul>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.key} className={LINE_IN} style={lineDelay(index + 1)}>
              <p className="flex">
                <span aria-hidden="true" className={BRANCH}>
                  {last ? '└── ' : '├── '}
                </span>
                <span className="min-w-0 break-words">{item.head}</span>
              </p>
              {item.detail && (
                <p className="flex">
                  <span aria-hidden="true" className={BRANCH}>
                    {last ? '    ' : '│   '}
                  </span>
                  <span className="min-w-0 break-words text-on-surface-muted">{item.detail}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {footer && (
        <p className={`whitespace-pre-wrap text-on-surface-muted ${LINE_IN}`} style={lineDelay(items.length + 1)}>
          {'    '}
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
