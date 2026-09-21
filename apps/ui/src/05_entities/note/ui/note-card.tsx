import { Link } from 'react-router-dom';
import { type NoteSummary } from '../api/types';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function NoteCard({ note }: { note: NoteSummary }) {
  const tags = [...note.aliases, ...note.keywords].slice(0, 3);

  return (
    <Link
      to={`/notes/${note.noteId}`}
      className="group flex h-full flex-col justify-between gap-3 rounded-lg border border-outline-variant/10 bg-surface-container-lowest p-5 transition-all duration-300 hover:border-accent/40 hover:bg-surface-container-lowest/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white"
    >
      <h3 className="line-clamp-3 font-sans text-headline-md text-text-primary transition-colors group-hover:text-accent">
        {note.title}
      </h3>
      <div className="flex flex-col gap-3">
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-accent-strong"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
        <span className="font-mono text-label-sm uppercase text-text-secondary">
          {formatDate(note.updatedAt)}
        </span>
      </div>
    </Link>
  );
}
