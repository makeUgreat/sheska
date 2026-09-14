import { type Ref } from 'react';
import {
  useInfiniteNotesScroll,
  useNotesArchive,
} from '@/features/notes-archive';
import { type NoteSummary } from '@/entities/note';
import { NotesGridSection, type NotesGridState } from './notes-grid-section';

function getNotesGridState({
  isLoading,
  error,
  notes,
  hasNextPage,
  isFetchingNextPage,
  sentinelRef,
}: {
  isLoading: boolean;
  error: Error | null;
  notes: NoteSummary[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  sentinelRef: Ref<HTMLDivElement>;
}): NotesGridState {
  if (isLoading) return { status: 'loading' };
  if (error) return { status: 'error', error };
  if (notes.length === 0) return { status: 'empty' };

  return {
    status: 'success',
    notes,
    hasNextPage,
    isFetchingNextPage,
    sentinelRef,
  };
}

export function NotesArchive() {
  const {
    notes,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotesArchive();
  const sentinelRef = useInfiniteNotesScroll({
    enabled: true,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });
  const state = getNotesGridState({
    isLoading,
    error,
    notes,
    hasNextPage,
    isFetchingNextPage,
    sentinelRef,
  });

  return <NotesGridSection state={state} />;
}
