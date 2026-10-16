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
    />
  );
}

function NoteHeader({ note }: { note: GetNoteResponse }) {
  return (
    <>
      <h1 className="break-words font-sans text-headline-md text-text-primary">
        {note.title}
      </h1>
      <p className="mt-2 flex flex-wrap gap-x-2 text-body-md text-text-muted">
        <time dateTime={note.updatedAt}>{formatDate(note.updatedAt)}</time>
        {note.keywords.map((keyword) => (
          <span key={keyword} className="flex gap-x-2">
            <span aria-hidden="true">·</span>
            <span>{keyword}</span>
          </span>
        ))}
      </p>
      {note.aliases.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-label-sm tracking-normal">
          {note.aliases.map((alias) => (
            <li key={alias} className="text-text-secondary">
              <span className="text-text-muted">#</span>
              {alias}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
