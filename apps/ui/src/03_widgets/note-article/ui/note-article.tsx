import { useNote, type GetNoteResponse } from '@/entities/note';
import { useArticleOutline, type Heading } from '@/shared/lib';
import {
  NoteArticleSection,
  type NoteArticleState,
} from './note-article-section';

function getNoteArticleState({
  isLoading,
  error,
  note,
  outline,
  activeHeadingId,
}: {
  isLoading: boolean;
  error: Error | null;
  note: GetNoteResponse | undefined;
  outline: Heading[];
  activeHeadingId: string | null;
}): NoteArticleState {
  if (isLoading) return { status: 'loading' };
  if (error) return { status: 'error', error };
  if (!note) return { status: 'empty' };

  return { status: 'success', note, outline, activeHeadingId };
}

export function NoteArticle({ noteId }: { noteId: string | undefined }) {
  const { data: note, isLoading, error } = useNote(noteId);
  const { outline, activeHeadingId } = useArticleOutline(note?.body);
  const state = getNoteArticleState({
    isLoading,
    error,
    note,
    outline,
    activeHeadingId,
  });

  return <NoteArticleSection state={state} />;
}
