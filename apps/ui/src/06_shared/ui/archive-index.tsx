import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatMonthDay } from '../lib';

export interface ArchiveEntry {
  id: string;
  href: string;
  title: ReactNode;
  date: string;
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

export function ArchiveIndex({
  entries,
  onActivate,
}: {
  entries: readonly ArchiveEntry[];
  onActivate?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-10">
      {groupByYear(entries).map(({ year, entries: yearEntries }) => (
        <section
          key={yearEntries[0].id}
          aria-labelledby={`archive-${yearEntries[0].id}`}
        >
          <h2
            id={`archive-${yearEntries[0].id}`}
            className="mb-1 font-mono text-label-sm tracking-normal text-text-muted"
          >
            {year}
          </h2>
          <ul className="group/archive">
            {yearEntries.map((entry) => (
              <li key={entry.id}>
                <Link
                  to={entry.href}
                  className={ENTRY}
                  onMouseEnter={() => onActivate?.(entry.id)}
                  onFocus={() => onActivate?.(entry.id)}
                >
                  <span className="truncate text-body-md">{entry.title}</span>
                  <time
                    dateTime={entry.date}
                    className="font-mono text-label-sm tracking-normal text-text-muted"
                  >
                    {formatMonthDay(entry.date)}
                  </time>
                  {entry.detail && (
                    <span className="col-span-2 line-clamp-2 text-body-md text-text-muted">
                      {entry.detail}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
