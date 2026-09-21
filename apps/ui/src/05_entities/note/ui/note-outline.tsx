import { type Heading } from '../lib/parse-outline';

const BESIDE_ARTICLE_UNTIL_THE_MARGIN_RUNS_OUT =
  'right-[max(var(--spacing-gutter),calc(50%_-_var(--spacing-measure)/2_-_var(--spacing-gutter)_-_200px))]';

const BELOW_HEADER = 'top-[calc(var(--spacing-header)+var(--spacing-gutter))]';

const WITHIN_REMAINING_HEIGHT =
  'max-h-[calc(100vh_-_var(--spacing-header)_-_2_*_var(--spacing-gutter))]';

const FADE =
  'transition-opacity duration-200 ease-out motion-reduce:transition-none';

const ON_POINTERLESS_DEVICES = '[@media(hover:none)]';

function DashRail({
  headings,
  activeId,
}: {
  headings: readonly Heading[];
  activeId: string | null;
}) {
  return (
    <ul
      aria-hidden="true"
      className={`flex flex-col items-end gap-2 ${FADE} group-hover:opacity-0 group-focus-within:opacity-0 toc:hidden ${ON_POINTERLESS_DEVICES}:hidden`}
    >
      {headings.map((heading) => (
        <li
          key={heading.id}
          className={[
            'h-px',
            heading.depth === 3 ? 'w-3' : 'w-5',
            heading.id === activeId
              ? 'bg-accent-strong'
              : 'bg-outline-variant/40',
          ].join(' ')}
        />
      ))}
    </ul>
  );
}

export function NoteOutline({
  headings,
  activeId,
}: {
  headings: readonly Heading[];
  activeId: string | null;
}) {
  return (
    <nav
      aria-label="On this page"
      className={`group fixed z-40 hidden py-2 pl-8 lg:block ${BELOW_HEADER} ${BESIDE_ARTICLE_UNTIL_THE_MARGIN_RUNS_OUT}`}
    >
      <DashRail headings={headings} activeId={activeId} />

      <div
        className={`absolute right-0 top-2 w-[200px] overflow-y-auto rounded-lg bg-page-background p-3 opacity-0 shadow-floating-panel toc:shadow-none ${WITHIN_REMAINING_HEIGHT} ${FADE} pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 toc:pointer-events-auto toc:opacity-100 ${ON_POINTERLESS_DEVICES}:pointer-events-auto ${ON_POINTERLESS_DEVICES}:opacity-100`}
      >
        <p className="mb-3 font-mono text-label-sm uppercase text-text-muted">
          On this page
        </p>
        <ul className="space-y-2 border-l border-outline-variant/20 pl-4">
          {headings.map((heading) => {
            const isActive = heading.id === activeId;
            return (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  aria-current={isActive ? 'location' : undefined}
                  className={[
                    'block font-mono text-label-sm transition-colors',
                    heading.depth === 3 ? 'pl-3' : '',
                    isActive
                      ? 'text-accent-strong'
                      : 'text-text-muted hover:text-text-primary',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
