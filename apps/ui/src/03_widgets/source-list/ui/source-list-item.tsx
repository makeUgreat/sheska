import { Link } from 'react-router-dom';
import {
  SyncJobBadge,
  SyncJobProgress,
  type SourceSummary,
  type SyncJobSummary,
} from '@/entities/source';
import { formatBytes } from '@/shared/lib';

function PublishedBadge() {
  return (
    <span className="rounded bg-accent-strong px-2 py-0.5 font-mono text-xs font-medium text-white">
      게시됨
    </span>
  );
}

function SourceSyncJobStatus({ syncJob }: { syncJob: SyncJobSummary | null }) {
  if (!syncJob) {
    return (
      <span className="font-mono text-xs text-text-secondary">no job</span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SyncJobBadge status={syncJob.status} />
      <SyncJobProgress syncJob={syncJob} />
    </div>
  );
}

export function SourceListItem({ source }: { source: SourceSummary }) {
  return (
    <li className="group relative py-6 pl-5 before:absolute before:left-0 before:top-6 before:h-[calc(100%-48px)] before:w-0.5 before:bg-transparent hover:before:bg-accent">
      <Link
        to={`/sources/${source.sourceId}`}
        className="absolute inset-0"
        aria-label={source.title}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="break-words text-2xl font-semibold leading-snug text-text-primary transition-colors group-hover:text-accent">
            {source.title}
          </span>
          <p className="mt-1 truncate font-mono text-xs text-text-secondary">
            {source.externalSourceId}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {source.publishedPostId && <PublishedBadge />}
          <SourceSyncJobStatus syncJob={source.latestSyncJob} />
          <span className="font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
            {formatBytes(source.sizeBytes)} ·{' '}
            {new Date(source.updatedAt).toLocaleString()}
          </span>
        </div>
      </div>
    </li>
  );
}
