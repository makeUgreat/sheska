import { type Heading } from '../lib/parse-outline';

export function NoteOutline({
  headings,
  activeId,
}: {
  headings: readonly Heading[];
  activeId: string | null;
}) {
  return (
    <nav aria-label="On this page">
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
    </nav>
  );
}
