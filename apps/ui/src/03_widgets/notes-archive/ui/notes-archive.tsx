import { type Ref, useState } from 'react';
import {
  useInfiniteNotesScroll,
  useNotesArchive,
} from '@/features/notes-archive';
import { type NoteSummary, useNote } from '@/entities/note';
import { useDebouncedValue } from '@/shared/lib';
import { NotesIndexSection, type NotesIndexState } from './notes-index-section';

/** 목록을 훑으며 지나가는 항목마다 본문을 받아오지 않도록, 잠시 머문 항목만 불러온다. */
const PEEK_FETCH_DELAY_MS = 200;

function getNotesIndexState({
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
}): NotesIndexState {
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const peekId = useDebouncedValue(activeId, PEEK_FETCH_DELAY_MS);
  const { data: peekNote } = useNote(peekId ?? undefined);
  const state = getNotesIndexState({
    isLoading,
    error,
    notes,
    hasNextPage,
    isFetchingNextPage,
    sentinelRef,
  });

  return (
    <NotesIndexSection
      state={state}
      activeId={activeId}
      onActivate={setActiveId}
      peekNote={peekNote}
    />
  );
}
