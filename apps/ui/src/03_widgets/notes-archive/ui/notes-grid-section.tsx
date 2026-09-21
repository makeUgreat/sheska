import { type Ref } from 'react';
import { NoteCard, type NoteSummary } from '@/entities/note';
import { StatusMessage } from '@/shared/ui';
import { EndOfNotes, NotesLoading } from './notes-loading';

export type NotesGridState =
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

export function NotesGridSection({ state }: { state: NotesGridState }) {
  return (
    <section className="min-h-screen bg-white px-4 py-20">
      <div className="mx-auto max-w-[1280px]">
        <h1 className="mb-12 font-sans text-headline-lg text-text-primary">
          Notes
        </h1>

        {state.status === 'loading' ? (
          <NotesLoading label="Loading notes..." />
        ) : state.status === 'error' ? (
          <StatusMessage tone="error">
            Error: {state.error.message}
          </StatusMessage>
        ) : state.status === 'empty' ? (
          <StatusMessage tone="empty">No notes yet.</StatusMessage>
        ) : (
          <>
            <NoteGrid notes={state.notes} />
            <div ref={state.sentinelRef} className="h-px" aria-hidden="true" />
            {state.isFetchingNextPage && <NotesLoading />}
            {!state.hasNextPage && <EndOfNotes />}
          </>
        )}
      </div>
    </section>
  );
}

function NoteGrid({ notes }: { notes: NoteSummary[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-11 md:grid-cols-2 xl:grid-cols-3">
      {notes.map((note) => (
        <li key={note.noteId}>
          <NoteCard note={note} />
        </li>
      ))}
    </ul>
  );
}
