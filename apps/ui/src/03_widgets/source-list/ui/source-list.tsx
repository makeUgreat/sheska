import { useListSources } from '@/entities/source';
import { useSourceListFilters } from '@/features/source-list-filters';
import { EmptyState, ErrorState, LoadingState, Pagination } from '@/shared/ui';
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
        <ErrorState error={error} />
      ) : sources.length === 0 ? (
        <EmptyState
          label={syncJobStatus ? 'No matching sources.' : 'No sources yet.'}
          className="py-24"
        />
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
