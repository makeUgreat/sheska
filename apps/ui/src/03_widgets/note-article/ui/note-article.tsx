import { useMemo } from 'react';
import {
  parseOutline,
  useNote,
  type GetNoteResponse,
  type Heading,
} from '@/entities/note';
import { useActiveHeading } from '@/shared/lib';
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
  const outline = useMemo(() => parseOutline(note?.body ?? ''), [note?.body]);
  const activeHeadingId = useActiveHeading(
    outline.map((heading) => heading.id),
  );
  const state = getNoteArticleState({
    isLoading,
    error,
    note,
    outline,
    activeHeadingId,
  });

  return <NoteArticleSection state={state} />;
}
