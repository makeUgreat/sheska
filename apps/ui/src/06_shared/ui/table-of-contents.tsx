import { type Heading } from '../lib/markdown';

/** `label-sm`의 넓은 자간은 대문자 label용이다. 대문자가 아닌 제목에서는 한 줄에 보이는 글자만 줄인다. */
const WITHOUT_LABEL_TRACKING = 'tracking-normal';

/** 절대 depth로 들여쓰면 `####`만 쓰는 본문이 통째로 밀린다. */
function indentStep(headings: readonly Heading[]) {
  const top = Math.min(...headings.map((heading) => heading.depth));
  return (heading: Heading) => Math.min(heading.depth - top, MAX_INDENT_STEP);
}

const MAX_INDENT_STEP = 2;
const LINK_INDENT = ['', 'pl-3', 'pl-6'];

export function TableOfContents({
  headings,
  activeId,
}: {
  headings: readonly Heading[];
  activeId: string | null;
}) {
  const stepOf = indentStep(headings);

  return (
    <nav
      aria-label="On this page"
      className="fixed z-40 hidden py-2 toc:block toc-beside-article"
    >
      <div className="overflow-y-auto p-3 toc-within-viewport-height">
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
                    LINK_INDENT[stepOf(heading)],
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
