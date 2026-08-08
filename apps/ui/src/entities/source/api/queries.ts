import { useQuery } from '@tanstack/react-query';
import { useHttpClient } from '@/shared/api';
import { getSource, listSources } from './client';

const SYNC_JOB_POLL_INTERVAL_MS = 2000;
const ACTIVE_SYNC_JOB_STATUSES = new Set(['pending', 'processing']);

export function useListSources() {
  const http = useHttpClient();
  return useQuery({
    queryKey: ['sources'],
    queryFn: () => listSources(http),
    refetchInterval: (query) => {
      const hasActiveSyncJob = query.state.data?.sources.some(
        (source) =>
          source.latestSyncJob &&
          ACTIVE_SYNC_JOB_STATUSES.has(source.latestSyncJob.status),
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
