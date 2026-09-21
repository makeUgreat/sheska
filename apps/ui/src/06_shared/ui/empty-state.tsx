const BAR = 'rounded-sm bg-outline-variant/10';
const BAR_STRONG = 'rounded-sm bg-outline-variant/15';
const GHOST_TOP = 'border-t border-dashed border-outline-variant/30';

export type EmptyVariant = 'grid' | 'list' | 'document' | 'search';

const COPY: Record<EmptyVariant, { kicker: string; label: string }> = {
  grid: { kicker: 'Empty', label: 'Nothing has been collected yet.' },
  list: { kicker: 'Empty', label: 'Nothing has been collected yet.' },
  document: {
    kicker: 'Not found',
    label: 'This page does not exist, or it was removed.',
  },
  search: { kicker: 'No results', label: 'Nothing matches this.' },
};

function GhostCard() {
  return (
    <div className={`${GHOST_TOP} pt-3`}>
      <div className={`mb-2 h-2 w-1/2 ${BAR}`} />
      <div className={`mb-2 h-3 w-[88%] ${BAR_STRONG}`} />
      <div className={`h-2 w-[70%] ${BAR}`} />
    </div>
  );
}

function GhostGrid() {
  return (
    <div className="grid w-[400px] max-w-full grid-cols-3 gap-x-6">
      <GhostCard />
      <GhostCard />
      <GhostCard />
    </div>
  );
}

function GhostList() {
  return (
    <div className="flex w-[340px] max-w-full flex-col gap-5">
      <GhostCard />
      <GhostCard />
    </div>
  );
}

function GhostDocument() {
  return (
    <div className={`w-[290px] max-w-full text-left ${GHOST_TOP} pt-3.5`}>
      <div className={`mb-3.5 h-4 w-[78%] ${BAR_STRONG}`} />
      <div className={`mb-2 h-2 w-[96%] ${BAR}`} />
      <div className={`mb-2 h-2 w-[88%] ${BAR}`} />
      <div className={`mb-2 h-2 w-[93%] ${BAR}`} />
      <div className={`h-2 w-[54%] ${BAR}`} />
    </div>
  );
}

function QueryMark({ query }: { query: string }) {
  return (
    <span className="rounded-md bg-accent/10 px-4 py-2.5 font-mono text-display-terminal text-accent-strong">
      &quot;{query}&quot;
    </span>
  );
}

type EmptyMark =
  | { variant: 'search'; query: string }
  | { variant: Exclude<EmptyVariant, 'search'>; query?: never };

export type EmptyStateProps = EmptyMark & { className?: string };

function Mark(mark: EmptyMark) {
  if (mark.variant === 'search') return <QueryMark query={mark.query} />;
  if (mark.variant === 'document') return <GhostDocument />;
  if (mark.variant === 'list') return <GhostList />;
  return <GhostGrid />;
}

export function EmptyState(props: EmptyStateProps) {
  const { variant, className = '' } = props;
  const { kicker, label } = COPY[variant];

  return (
    <div
      className={['flex flex-col items-center text-center', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mb-6 flex items-center justify-center" aria-hidden="true">
        <Mark {...props} />
      </div>
      <p className="font-mono text-label-sm uppercase text-text-muted">
        {kicker}
      </p>
      <p className="mt-3.5 text-body-md text-text-secondary">{label}</p>
    </div>
  );
}
