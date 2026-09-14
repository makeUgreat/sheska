import { useSearchParams } from 'react-router-dom';
import { useInfiniteListNotes } from '@/entities/note';

export function useNotesArchive() {
  const [searchParams] = useSearchParams();
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteListNotes(limit);

  return {
    notes: data?.pages.flatMap((page) => page.notes) ?? [],
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}
