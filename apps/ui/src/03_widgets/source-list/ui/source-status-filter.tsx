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
    <div className="mb-8 flex flex-wrap items-center gap-2">
      {FILTER_OPTIONS.map((status) => (
        <button
          key={status ?? 'all'}
          type="button"
          aria-pressed={value === status}
          onClick={() => onChange(status)}
          className={`rounded px-2 py-0.5 font-mono text-xs font-medium transition-colors ${
            value === status
              ? 'bg-accent text-white'
              : 'bg-surface-container-high text-text-secondary hover:text-text-primary'
          }`}
        >
          {status ?? 'all'}
        </button>
      ))}
    </div>
  );
}
