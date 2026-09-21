import { useListSources, type SourceSummary } from '@/entities/source';
import { useSourceListFilters } from '@/features/source-list-filters';
import { SourceListSection, type SourceListState } from './source-list-section';

function getSourceListState({
  isLoading,
  error,
  sources,
  page,
  totalPages,
  isPlaceholder,
}: {
  isLoading: boolean;
  error: Error | null;
  sources: SourceSummary[];
  page: number;
  totalPages: number;
  isPlaceholder: boolean;
}): SourceListState {
  if (isLoading) return { status: 'loading' };
  if (error) return { status: 'error', error };
  if (sources.length === 0) return { status: 'empty' };

  return { status: 'success', sources, page, totalPages, isPlaceholder };
}

export function SourceList() {
  const { page, syncJobStatus, setPage, setSyncJobStatus } =
    useSourceListFilters();
  const { data, isLoading, isPlaceholderData, error } = useListSources({
    page,
    syncJobStatus,
  });
  const state = getSourceListState({
    isLoading,
    error,
    sources: data?.sources ?? [],
    page,
    totalPages: data?.totalPages ?? 1,
    isPlaceholder: isPlaceholderData,
  });

  return (
    <SourceListSection
      filter={{ value: syncJobStatus, onChange: setSyncJobStatus }}
      onPageChange={setPage}
      state={state}
    />
  );
}
