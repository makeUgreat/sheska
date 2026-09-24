import { type Heading } from '../lib/markdown';

/**
 * Fills the margin beside the reading column, between `toc-min` and `toc-max`.
 * Below `toc-min` there is no margin left to fill, so the panel keeps that
 * width and lies over the column instead.
 */
const AS_WIDE_AS_THE_MARGIN_ALLOWS =
  '[--toc-width:clamp(var(--spacing-toc-min),calc(50%_-_var(--spacing-measure)/2_-_2_*_var(--spacing-gutter)),var(--spacing-toc-max))] w-[var(--toc-width)]';

const BESIDE_ARTICLE_UNTIL_THE_MARGIN_RUNS_OUT =
  'right-[max(var(--spacing-gutter),calc(50%_-_var(--spacing-measure)/2_-_var(--spacing-gutter)_-_var(--toc-width)))]';

const BELOW_HEADER = 'top-[calc(var(--spacing-header)+var(--spacing-gutter))]';

const WITHIN_REMAINING_HEIGHT =
  'max-h-[calc(100vh_-_var(--spacing-header)_-_2_*_var(--spacing-gutter))]';

const FADE =
  'transition-opacity duration-200 ease-out motion-reduce:transition-none';

const ON_POINTERLESS_DEVICES = '[@media(hover:none)]';

/**
 * `label-sm` tracks wide because labels are set in uppercase. Heading text is
 * not, and the extra space buys nothing here while it costs characters on a
 * line that has to end somewhere.
 */
const WITHOUT_LABEL_TRACKING = 'tracking-normal';

/**
 * The nav box is as wide as the panel, so only the parts that must answer the
 * pointer take it: the collapsed rail opens the panel, the panel keeps it open.
 * Everything else in that box is empty margin, or the reading column itself
 * where the panel overlaps it.
 */
const TRANSPARENT_TO_THE_POINTER = 'pointer-events-none';

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
      className={`ml-auto flex w-fit flex-col items-end gap-2 pl-8 ${FADE} pointer-events-auto group-hover:opacity-0 group-focus-within:opacity-0 toc:hidden ${ON_POINTERLESS_DEVICES}:hidden`}
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

export function ArticleOutline({
  headings,
  activeId,
}: {
  headings: readonly Heading[];
  activeId: string | null;
}) {
  return (
    <nav
      aria-label="On this page"
      className={`group fixed z-40 hidden py-2 lg:block ${TRANSPARENT_TO_THE_POINTER} ${BELOW_HEADER} ${AS_WIDE_AS_THE_MARGIN_ALLOWS} ${BESIDE_ARTICLE_UNTIL_THE_MARGIN_RUNS_OUT}`}
    >
      <DashRail headings={headings} activeId={activeId} />

      <div
        className={`absolute right-0 top-2 w-full overflow-y-auto rounded-lg bg-page-background p-3 opacity-0 shadow-floating-panel toc:shadow-none ${WITHIN_REMAINING_HEIGHT} ${FADE} pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 toc:pointer-events-auto toc:opacity-100 ${ON_POINTERLESS_DEVICES}:pointer-events-auto ${ON_POINTERLESS_DEVICES}:opacity-100`}
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
                  title={heading.text}
                  aria-current={isActive ? 'location' : undefined}
                  className={[
                    `block truncate font-mono text-label-sm transition-colors ${WITHOUT_LABEL_TRACKING}`,
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
