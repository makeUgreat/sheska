import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LINE_IN, lineDelay } from './line-in';

export interface ArchiveEntry {
  id: string;
  href: string;
  title: ReactNode;
  meta?: ReactNode;
  detail?: ReactNode;
}

const ENTRY =
  'group/entry flex flex-col gap-1 border-b border-outline-variant/12 py-6 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page-background';

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
        {entry.meta && (
          <span className="flex min-w-0 font-mono text-label-sm tracking-normal text-text-muted tabular-nums">{entry.meta}</span>
        )}
        <span className="break-words text-title-md text-text-primary transition-colors duration-150 group-hover/entry:text-accent-strong motion-reduce:transition-none">
          {entry.title}
        </span>
        {entry.detail}
      </Link>
    </li>
  );
}

export function ArchiveIndex({ entries }: { entries: readonly ArchiveEntry[] }) {
  const appearOrders = useAppearOrders(entries);

  return (
    <ul>
      {entries.map((entry) => (
        <ArchiveRow key={entry.id} entry={entry} appearOrder={appearOrders.get(entry.id) ?? 0} />
      ))}
    </ul>
  );
}
