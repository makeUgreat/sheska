import { type GetNoteResponse } from '@/entities/note';
import { formatDate, type Heading } from '@/shared/lib';
import {
  ArticleLayout,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/shared/ui';

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
    <ArticleLayout
      header={<NoteHeader note={note} />}
      body={note.body}
      outline={outline}
      activeHeadingId={activeHeadingId}
      footer={
        note.keywords.length > 0 && (
          <footer className="mt-14 border-t border-outline-variant/20 pt-6">
            <MetaLine label="topics" values={note.keywords} />
          </footer>
        )
      }
    />
  );
}

function NoteHeader({ note }: { note: GetNoteResponse }) {
  return (
    <>
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
    </>
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
