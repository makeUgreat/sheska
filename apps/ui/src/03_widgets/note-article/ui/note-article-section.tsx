import {
  NoteBody,
  NoteOutline,
  type GetNoteResponse,
  type Heading,
} from '@/entities/note';
import { formatDate } from '@/shared/lib';
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui';

const OUTLINE_MINIMUM_HEADINGS = 2;

export type NoteArticleState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'empty' }
  | {
      status: 'success';
      note: GetNoteResponse;
      outline: Heading[];
      activeHeadingId: string | null;
    };

export function NoteArticleSection({ state }: { state: NoteArticleState }) {
  if (state.status === 'loading') {
    return <LoadingState className="py-24" />;
  }

  if (state.status === 'error') {
    return <ErrorState error={state.error} />;
  }

  if (state.status === 'empty') {
    return <EmptyState variant="document" className="py-24" />;
  }

  const { note, outline, activeHeadingId } = state;

  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,680px)_200px] lg:justify-center">
      <article className="min-w-0">
        <NoteHeader note={note} />

        {note.body && <NoteBody body={note.body} outline={outline} />}

        {note.keywords.length > 0 && (
          <footer className="mt-14 border-t border-outline-variant/20 pt-6">
            <MetaLine label="topics" values={note.keywords} />
          </footer>
        )}
      </article>

      {outline.length >= OUTLINE_MINIMUM_HEADINGS && (
        <div className="hidden lg:block">
          <div className="sticky top-[calc(var(--spacing-header)+var(--spacing-gutter))]">
            <NoteOutline headings={outline} activeId={activeHeadingId} />
          </div>
        </div>
      )}
    </div>
  );
}

function NoteHeader({ note }: { note: GetNoteResponse }) {
  return (
    <header className="mb-20">
      <h1 className="break-words font-sans text-headline-lg text-text-primary">
        {note.title}
      </h1>
      {note.aliases.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1 font-mono text-label-sm">
          {note.aliases.map((alias) => (
            <li key={alias} className="text-accent-strong">
              <span className="text-text-muted">#</span>
              {alias}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 font-mono text-label-sm uppercase text-text-muted">
        {formatDate(note.updatedAt)}
      </p>
    </header>
  );
}

function MetaLine({
  label,
  values,
}: {
  label: string;
  values: readonly string[];
}) {
  return (
    <p className="font-mono text-label-sm">
      <span className="uppercase text-text-muted">{label} </span>
      {values.map((value, index) => (
        <span key={value}>
          {index > 0 && <span className="text-text-muted"> / </span>}
          <span className="text-text-secondary">{value}</span>
        </span>
      ))}
    </p>
  );
}
