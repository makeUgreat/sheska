import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatMonthDay } from '../lib';
import { LINE_IN, lineDelay } from './line-in';

export interface ArchiveEntry {
  id: string;
  href: string;
  title: ReactNode;
  date: string;
  meta?: readonly string[];
  detail?: ReactNode;
}

interface YearGroup {
  year: number;
  entries: ArchiveEntry[];
}

/** 목록이 날짜순이 아니어도 연도가 바뀌는 지점에서만 끊어, 같은 연도가 흩어지면 그대로 따로 보인다. */
function groupByYear(entries: readonly ArchiveEntry[]): YearGroup[] {
  const groups: YearGroup[] = [];

  for (const entry of entries) {
    const year = new Date(entry.date).getFullYear();
    const last = groups.at(-1);
    if (last?.year === year) last.entries.push(entry);
    else groups.push({ year, entries: [entry] });
  }

  return groups;
}

const ENTRY =
  'group/entry flex flex-col gap-1.5 border-b border-outline-variant/12 py-6 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page-background';

const YEAR_IN_MARGIN =
  'margin-label:-ml-[calc(var(--spacing-margin-label)+var(--spacing-gutter))] margin-label:grid ' +
  'margin-label:grid-cols-[var(--spacing-margin-label)_minmax(0,1fr)] margin-label:items-start margin-label:gap-x-gutter';

const YEAR =
  'border-b border-text-primary pb-3 font-mono text-label-sm font-semibold tracking-normal text-text-primary tabular-nums ' +
  'margin-label:sticky margin-label:top-[var(--spacing-header)] margin-label:border-0 margin-label:pb-0 margin-label:pt-6 margin-label:text-right';

/** 이번 render에서 처음 보이는 항목에만 0부터 순서를 매긴다. 무한 스크롤로 붙은 묶음도 0부터 다시 센다. */
function useAppearOrders(entries: readonly ArchiveEntry[]) {
  const shownIds = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => {
    shownIds.current = new Set(entries.map(({ id }) => id));
  });

  const orders = new Map<string, number>();
  for (const { id } of entries) {
    if (!shownIds.current.has(id)) orders.set(id, orders.size);
  }

  return orders;
}

function ArchiveRow({ entry, appearOrder }: { entry: ArchiveEntry; appearOrder: number }) {
  /** 다음 render에서 지연이 바뀌면 진행 중인 animation이 어긋나므로 mount 때 값으로 고정한다. */
  const [delay] = useState(() => lineDelay(appearOrder));

  return (
    <li className={LINE_IN} style={delay}>
      <Link to={entry.href} className={ENTRY}>
        <span className="flex flex-wrap font-mono text-label-sm tracking-normal text-text-muted tabular-nums">
          <time dateTime={entry.date}>{formatMonthDay(entry.date)}</time>
          {entry.meta?.map((item) => (
            <span key={item}>
              <span aria-hidden="true" className="mx-2">
                ·
              </span>
              {item}
            </span>
          ))}
        </span>
        <span className="break-words text-title-md text-text-primary transition-colors duration-150 group-hover/entry:text-accent-strong motion-reduce:transition-none">
          {entry.title}
        </span>
        {entry.detail && <span className="line-clamp-2 text-body-md text-text-muted">{entry.detail}</span>}
      </Link>
    </li>
  );
}

export function ArchiveIndex({ entries }: { entries: readonly ArchiveEntry[] }) {
  const appearOrders = useAppearOrders(entries);

  return (
    <div className="flex flex-col gap-14">
      {groupByYear(entries).map(({ year, entries: yearEntries }) => (
        <section key={yearEntries[0].id} aria-labelledby={`archive-${yearEntries[0].id}`} className={YEAR_IN_MARGIN}>
          <h2 id={`archive-${yearEntries[0].id}`} className={YEAR}>
            {year}
          </h2>
          <ul>
            {yearEntries.map((entry) => (
              <ArchiveRow key={entry.id} entry={entry} appearOrder={appearOrders.get(entry.id) ?? 0} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
