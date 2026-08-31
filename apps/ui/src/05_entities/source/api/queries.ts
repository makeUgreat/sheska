import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useHttpClient } from '@/shared/api';
import { getSource, listSources } from './client';

const SYNC_JOB_POLL_INTERVAL_MS = 2000;
const ACTIVE_SYNC_JOB_STATUSES = new Set(['pending', 'processing']);

export function useInfiniteListSources(limit?: number) {
  const http = useHttpClient();
  return useInfiniteQuery({
    queryKey: ['sources', 'infinite', limit],
    queryFn: ({ pageParam }) => listSources(http, { cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: (query) => {
      const hasActiveSyncJob = query.state.data?.pages.some((page) =>
        page.sources.some(
          (source) =>
            source.latestSyncJob &&
            ACTIVE_SYNC_JOB_STATUSES.has(source.latestSyncJob.status),
        ),
      );
      return hasActiveSyncJob ? SYNC_JOB_POLL_INTERVAL_MS : false;
    },
  });
}

export function useSource(id: string | undefined) {
  const http = useHttpClient();
  return useQuery({
    queryKey: ['sources', id],
    queryFn: () => getSource(http, id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.latestSyncJob?.status;
      return status && ACTIVE_SYNC_JOB_STATUSES.has(status)
        ? SYNC_JOB_POLL_INTERVAL_MS
        : false;
    },
  });
}
