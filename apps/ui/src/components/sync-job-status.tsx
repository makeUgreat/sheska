import { type SyncJobSummary } from '@/api/client';

const STATUS_STYLES: Record<SyncJobSummary['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export function SyncJobBadge({ status }: { status: SyncJobSummary['status'] }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700';

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
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
        className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200"
      >
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">
        {syncJob.processedChunks}/{syncJob.totalChunks} ({percent}%)
      </span>
    </div>
  );
}
