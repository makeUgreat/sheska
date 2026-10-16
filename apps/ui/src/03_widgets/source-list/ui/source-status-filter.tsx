import { type SyncJobSummaryStatus } from '@/entities/source';
import { SYNC_JOB_STATUS_FILTERS } from '@/features/source-list-filters';

const FILTER_OPTIONS: readonly (SyncJobSummaryStatus | undefined)[] = [
  undefined,
  ...SYNC_JOB_STATUS_FILTERS,
];

export function SourceStatusFilter({
  value,
  onChange,
}: {
  value: SyncJobSummaryStatus | undefined;
  onChange: (status: SyncJobSummaryStatus | undefined) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filter by embedding status"
      className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-1"
    >
      {FILTER_OPTIONS.map((status) => (
        <button
          key={status ?? 'all'}
          type="button"
          aria-pressed={value === status}
          onClick={() => onChange(status)}
          className="text-body-md text-text-muted transition-colors hover:text-text-primary aria-pressed:text-text-primary focus:outline-none focus-visible:text-accent-strong"
        >
          {status ?? 'all'}
        </button>
      ))}
    </div>
  );
}
