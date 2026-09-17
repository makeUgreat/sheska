import { useSearchParams } from 'react-router-dom';
import { type SyncJobSummaryStatus } from '@/entities/source';

export const SYNC_JOB_STATUS_FILTERS: readonly SyncJobSummaryStatus[] = [
  'waiting',
  'completed',
  'failed',
];

function isSyncJobStatus(
  value: string | null,
): value is SyncJobSummaryStatus {
  return (SYNC_JOB_STATUS_FILTERS as readonly string[]).includes(value ?? '');
}

function parsePage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

export function useSourceListFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get('page'));
  const statusParam = searchParams.get('syncJobStatus');
  const syncJobStatus = isSyncJobStatus(statusParam) ? statusParam : undefined;

  function setPage(nextPage: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(nextPage));
      return next;
    });
  }

  function setSyncJobStatus(nextStatus: SyncJobSummaryStatus | undefined) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextStatus) {
        next.set('syncJobStatus', nextStatus);
      } else {
        next.delete('syncJobStatus');
      }
      next.delete('page');
      return next;
    });
  }

  return { page, syncJobStatus, setPage, setSyncJobStatus };
}
