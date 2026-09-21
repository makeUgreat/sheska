import {
  type SourceSummary,
  type SyncJobSummaryStatus,
} from '@/entities/source';
import { EmptyState, ErrorState, LoadingState, Pagination } from '@/shared/ui';
import { SourceListItem } from './source-list-item';
import { SourceStatusFilter } from './source-status-filter';

export type SourceListState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'empty' }
  | {
      status: 'success';
      sources: SourceSummary[];
      page: number;
      totalPages: number;
      isFetching: boolean;
    };

export function SourceListSection({
  filter,
  onPageChange,
  state,
}: {
  filter: {
    value: SyncJobSummaryStatus | undefined;
    onChange: (status: SyncJobSummaryStatus | undefined) => void;
  };
  onPageChange: (page: number) => void;
  state: SourceListState;
}) {
  return (
    <>
      <SourceStatusFilter value={filter.value} onChange={filter.onChange} />

      {state.status === 'loading' ? (
        <LoadingState className="py-24" />
      ) : state.status === 'error' ? (
        <ErrorState error={state.error} />
      ) : state.status === 'empty' ? (
        <EmptyState
          label={filter.value ? 'No matching sources.' : 'No sources yet.'}
          className="py-24"
        />
      ) : (
        <>
          <SourceItemList
            sources={state.sources}
            isFetching={state.isFetching}
          />
          <Pagination
            page={state.page}
            totalPages={state.totalPages}
            onPageChange={onPageChange}
            disabled={state.isFetching}
          />
        </>
      )}
    </>
  );
}

function SourceItemList({
  sources,
  isFetching,
}: {
  sources: SourceSummary[];
  isFetching: boolean;
}) {
  return (
    <ul
      className={`divide-y divide-outline-variant/10 border-y border-outline-variant/10 transition-opacity duration-200 ${
        isFetching ? 'opacity-40' : 'opacity-100'
      }`}
    >
      {sources.map((source) => (
        <SourceListItem key={source.sourceId} source={source} />
      ))}
    </ul>
  );
}
