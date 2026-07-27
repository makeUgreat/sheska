import { type SyncJobSummary } from '@/api/client';

const STATUS_STYLES: Record<SyncJobSummary['status'], string> = {
  pending: 'bg-[#282c34] text-[#abb2bf]',
  processing: 'bg-[#282c34] text-primary',
  completed: 'bg-[#e06c75] text-white',
  failed: 'bg-error-container text-on-error-container',
};

export function SyncJobBadge({ status }: { status: SyncJobSummary['status'] }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700';

  return (
    <span
      className={`rounded px-2 py-0.5 font-mono text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}

export function SyncJobProgress({ syncJob }: { syncJob: SyncJobSummary }) {
  if (
    syncJob.status !== 'processing' ||
    syncJob.totalChunks === null ||
    syncJob.totalChunks === 0
  ) {
    return null;
  }

  const percent = Math.min(
    100,
    Math.round((syncJob.processedChunks / syncJob.totalChunks) * 100),
  );

  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-variant"
      >
        <div
          className="h-full rounded-full bg-[#e06c75] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="font-mono text-xs text-text-secondary">
        {syncJob.processedChunks}/{syncJob.totalChunks} ({percent}%)
      </span>
    </div>
  );
}
