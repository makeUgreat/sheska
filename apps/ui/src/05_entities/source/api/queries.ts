import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttpClient } from '@/shared/api';
import { getSource, getSyncJob, listSources } from './client';
import { type SyncJobStatus, type SyncJobSummary } from './types';

const SYNC_JOB_POLL_INTERVAL_MS = 2000;
const ACTIVE_SYNC_JOB_STATUSES = new Set(['pending', 'processing']);

export interface UseListSourcesParams {
  page: number;
  pageSize?: number;
  syncJobStatus?: SyncJobStatus;
}

export function useListSources({
  page,
  pageSize,
  syncJobStatus,
}: UseListSourcesParams) {
  const http = useHttpClient();
  return useQuery({
    queryKey: ['sources', 'list', page, pageSize, syncJobStatus],
    queryFn: () => listSources(http, { page, pageSize, syncJobStatus }),
    placeholderData: (previousData) => previousData,
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
  });
}

export function useSyncJob(
  syncJob: SyncJobSummary | null | undefined,
  sourceId: string | undefined,
) {
  const http = useHttpClient();
  const queryClient = useQueryClient();
  const isActive =
    syncJob !== null &&
    syncJob !== undefined &&
    ACTIVE_SYNC_JOB_STATUSES.has(syncJob.status);

  return useQuery({
    queryKey: ['sync-jobs', syncJob?.syncJobId],
    queryFn: async () => {
      const result = await getSyncJob(http, syncJob!.syncJobId);
      if (!ACTIVE_SYNC_JOB_STATUSES.has(result.status) && sourceId) {
        void queryClient.invalidateQueries({ queryKey: ['sources', sourceId] });
      }
      return result;
    },
    enabled: isActive,
    refetchInterval: (query) =>
      query.state.data && ACTIVE_SYNC_JOB_STATUSES.has(query.state.data.status)
        ? SYNC_JOB_POLL_INTERVAL_MS
        : false,
  });
}
