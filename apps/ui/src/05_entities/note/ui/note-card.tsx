import { Link } from 'react-router-dom';
import { type NoteSummary } from '../api/types';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type TagItem = { value: string; kind: 'alias' | 'keyword' };

function toTagItems(note: NoteSummary): TagItem[] {
  return [
    ...note.aliases.map((value): TagItem => ({ value, kind: 'alias' })),
    ...note.keywords.map((value): TagItem => ({ value, kind: 'keyword' })),
  ];
}

function TagLine({ items }: { items: TagItem[] }) {
  if (items.length === 0) {
    return (
      <span
        className="font-mono text-label-sm text-text-muted"
        aria-hidden="true"
      >
        —
      </span>
    );
  }

  return (
    <span className="font-mono text-label-sm">
      {items.map((item, index) => (
        <span key={`${item.kind}-${item.value}`}>
          {index > 0 && <span className="text-text-muted"> / </span>}
          <span
            className={
              item.kind === 'alias'
                ? 'text-accent-strong'
                : 'text-text-secondary'
            }
          >
            {item.value}
          </span>
        </span>
      ))}
    </span>
  );
}

export function NoteCard({ note }: { note: NoteSummary }) {
  return (
    <Link
      to={`/notes/${note.noteId}`}
      className="group block h-full border-t border-outline-variant/20 py-6 transition-colors hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-white"
    >
      <span className="block font-mono text-label-sm uppercase text-text-muted">
        {formatDate(note.updatedAt)}
      </span>
      <h3 className="mt-2.5 font-sans text-headline-md text-text-primary transition-colors group-hover:text-accent-strong">
        {note.title}
      </h3>
      <p className="mt-3">
        <TagLine items={toTagItems(note)} />
      </p>
    </Link>
  );
}
