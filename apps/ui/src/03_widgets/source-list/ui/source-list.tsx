import { useListSources } from '@/entities/source';
import { useSourceListFilters } from '@/features/source-list-filters';
import { LoadingState, Pagination, StatusMessage } from '@/shared/ui';
import { SourceListItem } from './source-list-item';
import { SourceStatusFilter } from './source-status-filter';

export function SourceList() {
  const { page, syncJobStatus, setPage, setSyncJobStatus } =
    useSourceListFilters();
  const { data, isLoading, isFetching, error } = useListSources({
    page,
    syncJobStatus,
  });
  const sources = data?.sources ?? [];

  return (
    <>
      <SourceStatusFilter value={syncJobStatus} onChange={setSyncJobStatus} />

      {isLoading ? (
        <LoadingState className="py-24" />
      ) : error ? (
        <StatusMessage tone="error">Error: {error.message}</StatusMessage>
      ) : sources.length === 0 ? (
        <StatusMessage tone="empty">
          {syncJobStatus ? 'No matching sources.' : 'No sources yet.'}
        </StatusMessage>
      ) : (
        <>
          <ul
            className={`divide-y divide-outline-variant/10 border-y border-outline-variant/10 transition-opacity duration-200 ${
              isFetching ? 'opacity-40' : 'opacity-100'
            }`}
          >
            {sources.map((s) => (
              <SourceListItem key={s.sourceId} source={s} />
            ))}
          </ul>
          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
            disabled={isFetching}
          />
        </>
      )}
    </>
  );
}
