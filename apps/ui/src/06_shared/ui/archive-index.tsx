import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatMonthDay } from '../lib';
import { LINE_IN, lineDelay } from './line-in';

export interface ArchiveEntry {
  id: string;
  href: string;
  title: ReactNode;
  date: string;
  note?: ReactNode;
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
  'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 border-b border-outline-variant/12 py-2.5 ' +
  'text-text-primary transition-colors duration-150 group-hover/archive:not-hover:text-text-muted ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page-background ' +
  'motion-reduce:transition-none';

const YEAR_IN_MARGIN =
  'margin-label:-ml-[calc(var(--spacing-margin-label)+var(--spacing-gutter))] margin-label:grid ' +
  'margin-label:grid-cols-[var(--spacing-margin-label)_minmax(0,1fr)] margin-label:items-baseline margin-label:gap-x-gutter';

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
        <span className="truncate text-body-md">{entry.title}</span>
        <span className="flex gap-3 font-mono text-label-sm tracking-normal text-text-muted tabular-nums">
          {entry.note}
          <time dateTime={entry.date}>{formatMonthDay(entry.date)}</time>
        </span>
        {entry.detail && <span className="col-span-2 line-clamp-2 text-body-md text-text-muted">{entry.detail}</span>}
      </Link>
    </li>
  );
}

export function ArchiveIndex({ entries }: { entries: readonly ArchiveEntry[] }) {
  const appearOrders = useAppearOrders(entries);

  return (
    <div className="flex flex-col gap-10">
      {groupByYear(entries).map(({ year, entries: yearEntries }) => (
        <section key={yearEntries[0].id} aria-labelledby={`archive-${yearEntries[0].id}`} className={YEAR_IN_MARGIN}>
          <h2
            id={`archive-${yearEntries[0].id}`}
            className="mb-1 font-mono text-label-sm tracking-normal text-text-muted margin-label:mb-0 margin-label:text-right"
          >
            {year}
          </h2>
          <ul className="group/archive">
            {yearEntries.map((entry) => (
              <ArchiveRow key={entry.id} entry={entry} appearOrder={appearOrders.get(entry.id) ?? 0} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
