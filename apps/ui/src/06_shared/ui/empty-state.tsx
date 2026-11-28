import type { ReactNode } from 'react';

const GHOST = 'rounded-[3px] bg-outline-variant/6';
const GHOST_STRONG = 'rounded-[3px] bg-outline-variant/9';
const ROW_LINE = 'border-outline-variant/12';
const RISE = 'animate-[terminal-line-in_420ms_cubic-bezier(0.2,0.7,0.3,1)_both] motion-reduce:animate-none';
const RISE_STAGGER_MS = 90;
const LABEL_DELAY_MS = 360;
const FADE_OUT = '[mask-image:linear-gradient(rgb(0_0_0/0.7),transparent_90%)]';

export type EmptyVariant = 'list' | 'search' | 'document';

type GhostRowShape = { meta: string; title: string; summary: [string, string] };

const ROWS: GhostRowShape[] = [
  { meta: 'w-[84px]', title: 'w-[62%]', summary: ['w-[94%]', 'w-[71%]'] },
  { meta: 'w-[64px]', title: 'w-[48%]', summary: ['w-[88%]', 'w-[58%]'] },
  { meta: 'w-[64px]', title: 'w-[56%]', summary: ['w-[91%]', 'w-[66%]'] },
  { meta: 'w-[64px]', title: 'w-[44%]', summary: ['w-[85%]', 'w-[52%]'] },
];

const PARAGRAPH = ['w-[96%]', 'w-[89%]', 'w-[93%]', 'w-[61%]'];

function rise(order: number) {
  return { animationDelay: `${order * RISE_STAGGER_MS}ms` };
}

function GhostRow({ shape, withMeta, bordered = true }: { shape: GhostRowShape; withMeta: boolean; bordered?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 py-6 ${bordered ? `border-b ${ROW_LINE}` : ''}`}>
      {withMeta && (
        <span className="flex h-4 items-center">
          <span className={`h-2 ${shape.meta} ${GHOST}`} />
        </span>
      )}
      <span className="flex h-[30px] items-center">
        <span className={`h-3.5 ${shape.title} ${GHOST_STRONG}`} />
      </span>
      <span className="mt-1 flex flex-col gap-1">
        {shape.summary.map((width) => (
          <span key={width} className="grid h-[22px] grid-cols-[24px_minmax(0,1fr)] items-center">
            <span className={`h-2 w-3 ${GHOST}`} />
            <span className={`h-2 ${width} ${GHOST}`} />
          </span>
        ))}
      </span>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p
      className="animate-fade-in bg-page-background px-4 font-mono text-label-sm uppercase text-text-muted motion-reduce:animate-none"
      style={{ animationDelay: `${LABEL_DELAY_MS}ms` }}
    >
      {children}
    </p>
  );
}

function SearchLabel({ query }: { query: string }) {
  return (
    <Label>
      No match for <span className="normal-case tracking-normal text-text-primary">&quot;{query}&quot;</span>
    </Label>
  );
}

function GhostList({ label, withMetaOnEveryRow }: { label: ReactNode; withMetaOnEveryRow: boolean }) {
  const [first, ...rest] = ROWS;

  return (
    <>
      <div aria-hidden="true" className={RISE}>
        <GhostRow shape={first} withMeta bordered={false} />
      </div>
      <div className={`relative flex h-px items-center justify-center bg-outline-variant/12 ${RISE}`}>{label}</div>
      <div aria-hidden="true" className={FADE_OUT}>
        {rest.map((shape, index) => (
          <div key={shape.title} className={RISE} style={rise(index + 1)}>
            <GhostRow shape={shape} withMeta={withMetaOnEveryRow} />
          </div>
        ))}
      </div>
    </>
  );
}

function GhostDocument() {
  return (
    <div aria-hidden="true" className={`pt-2 ${FADE_OUT}`}>
      <div className={`h-2 w-[28%] ${GHOST} ${RISE}`} />
      <div className={`mt-3.5 h-[22px] w-[72%] rounded ${GHOST_STRONG} ${RISE}`} />
      {PARAGRAPH.map((width, index) => (
        <div key={width} className={`h-2 ${width} ${GHOST} ${RISE} ${index === 0 ? 'mt-9' : 'mt-3.5'}`} style={rise(index < 2 ? 1 : 2)} />
      ))}
    </div>
  );
}

type EmptyMark = { variant: 'search'; query: string } | { variant: Exclude<EmptyVariant, 'search'>; query?: never };

export type EmptyStateProps = EmptyMark & { className?: string };

function Content(mark: EmptyMark) {
  switch (mark.variant) {
    case 'search':
      return <GhostList label={<SearchLabel query={mark.query} />} withMetaOnEveryRow />;
    case 'list':
      return <GhostList label={<Label>Empty</Label>} withMetaOnEveryRow={false} />;
    case 'document':
      return (
        <>
          <GhostDocument />
          <div className="mt-6 flex justify-center">
            <Label>Not found</Label>
          </div>
        </>
      );
  }
}

export function EmptyState(props: EmptyStateProps) {
  const { className = '' } = props;

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
      <Content {...props} />
    </div>
  );
}
