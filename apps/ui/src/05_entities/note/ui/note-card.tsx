import { formatDate } from '@/shared/lib';
import { CARD_LINK_TITLE, CardLink } from '@/shared/ui';
import { type NoteSummary } from '../api/types';

const VISIBLE_KEYWORD_LIMIT = 3;

function KeywordLine({ keywords }: { keywords: string[] }) {
  if (keywords.length === 0) {
    return (
      <span
        className="font-mono text-label-sm text-text-muted"
        aria-hidden="true"
      >
        —
      </span>
    );
  }

  const visible = keywords.slice(0, VISIBLE_KEYWORD_LIMIT);
  const hiddenCount = keywords.length - visible.length;

  return (
    <>
      <span className="min-w-0 truncate font-mono text-label-sm">
        {visible.map((keyword, index) => (
          <span key={keyword}>
            {index > 0 && <span className="text-text-muted"> / </span>}
            <span className="text-text-secondary">{keyword}</span>
          </span>
        ))}
      </span>
      {hiddenCount > 0 && (
        <span className="shrink-0 font-mono text-label-sm text-text-muted">
          +{hiddenCount}
        </span>
      )}
    </>
  );
}

export function NoteCard({ note }: { note: NoteSummary }) {
  return (
    <CardLink
      to={`/notes/${note.noteId}`}
      className="-mx-3.5 h-full px-3.5 py-6"
    >
      <span className="block font-mono text-label-sm uppercase text-text-muted">
        {formatDate(note.updatedAt)}
      </span>
      <h3
        className={`mt-2.5 line-clamp-2 font-sans text-headline-md text-text-primary ${CARD_LINK_TITLE}`}
      >
        {note.title}
      </h3>
      <p className="mt-3 flex items-baseline gap-2">
        <KeywordLine keywords={note.keywords} />
      </p>
    </CardLink>
  );
}
