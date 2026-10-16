import { type Ref } from 'react';
import { type GetNoteResponse, type NoteSummary } from '@/entities/note';
import { formatDate, leadingText } from '@/shared/lib';
import {
  ArchiveIndex,
  EmptyState,
  EndOfList,
  ErrorState,
  LoadingState,
  PeekLayout,
} from '@/shared/ui';

const ARCHIVE_SPACING = 'mt-16';
const PEEK_TEXT_LENGTH = 280;

export type NotesIndexState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'empty' }
  | {
      status: 'success';
      notes: NoteSummary[];
      hasNextPage: boolean;
      isFetchingNextPage: boolean;
      sentinelRef: Ref<HTMLDivElement>;
    };

export function NotesIndexSection({
  state,
  activeId = null,
  onActivate,
  peekNote,
}: {
  state: NotesIndexState;
  activeId?: string | null;
  onActivate?: (noteId: string) => void;
  peekNote?: GetNoteResponse;
}) {
  const notes = state.status === 'success' ? state.notes : [];
  const activeNote =
    notes.find((note) => note.noteId === activeId) ?? notes.at(0);
  const activeBody =
    peekNote && peekNote.noteId === activeNote?.noteId ? peekNote.body : null;

  return (
    <section className="px-4 pb-32 pt-16">
      <PeekLayout
        peek={activeNote && <NotePeek note={activeNote} body={activeBody} />}
      >
        <h1 className="text-body-md font-semibold text-text-primary">Notes</h1>

        <div className="mt-10">
          {state.status === 'loading' ? (
            <LoadingState className={ARCHIVE_SPACING} />
          ) : state.status === 'error' ? (
            <ErrorState error={state.error} />
          ) : state.status === 'empty' ? (
            <EmptyState variant="list" className={ARCHIVE_SPACING} />
          ) : (
            <>
              <ArchiveIndex
                entries={state.notes.map((note) => ({
                  id: note.noteId,
                  href: `/notes/${note.noteId}`,
                  title: note.title,
                  date: note.createdAt,
                }))}
                onActivate={onActivate}
              />
              <div
                ref={state.sentinelRef}
                className="h-px"
                aria-hidden="true"
              />
              {state.isFetchingNextPage && (
                <LoadingState className={ARCHIVE_SPACING} />
              )}
              {!state.hasNextPage && (
                <EndOfList label="End of notes" className={ARCHIVE_SPACING} />
              )}
            </>
          )}
        </div>
      </PeekLayout>
    </section>
  );
}

function NotePeek({ note, body }: { note: NoteSummary; body: string | null }) {
  const text = body === null ? '' : leadingText(body, PEEK_TEXT_LENGTH);

  return (
    <div>
      <p className="font-mono text-label-sm tracking-normal text-text-muted">
        {formatDate(note.updatedAt)}
      </p>
      <p className="mt-2 break-words text-headline-md text-text-primary">
        {note.title}
      </p>
      {text && <p className="mt-3 text-body-md text-text-secondary">{text}</p>}
      {note.keywords.length > 0 && (
        <p className="mt-4 font-mono text-label-sm tracking-normal text-text-muted">
          {note.keywords.join(' · ')}
        </p>
      )}
    </div>
  );
}
