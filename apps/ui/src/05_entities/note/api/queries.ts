import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useHttpClient } from '@/shared/api';
import { getNote, listNotes } from './client';

export function useNote(id: string | undefined) {
  const http = useHttpClient();
  return useQuery({
    queryKey: ['notes', id],
    queryFn: () => getNote(http, id!),
    enabled: !!id,
  });
}

export function useInfiniteListNotes(limit?: number, enabled = true) {
  const http = useHttpClient();
  return useInfiniteQuery({
    queryKey: ['notes', 'infinite', limit],
    queryFn: ({ pageParam }) => listNotes(http, { cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
  });
}
