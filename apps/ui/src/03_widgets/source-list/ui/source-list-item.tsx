import { Link } from 'react-router-dom';
import {
  SyncJobProgress,
  type SourceSummary,
  type SyncJobSummaryStatus,
} from '@/entities/source';
import { formatBytes, formatDate } from '@/shared/lib';

/** 색을 늘리지 않고 모양으로 상태를 가른다. 실패만 accent로 칠해 먼저 눈에 띄게 한다. */
const STATUS_GLYPH: Record<SyncJobSummaryStatus, string> = {
  completed: '●',
  waiting: '○',
  failed: '■',
};

const META = 'font-mono text-label-sm tracking-normal text-text-muted';

export function SourceListItem({ source }: { source: SourceSummary }) {
  const syncJob = source.latestSyncJob;
  const failed = syncJob?.status === 'failed';

  return (
    <li>
      <Link
        to={`/sources/${source.sourceId}`}
        aria-label={source.title}
        className="group/source grid grid-cols-[1rem_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 border-b border-outline-variant/12 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page-background"
      >
        <span
          aria-hidden="true"
          className={`font-mono text-label-sm ${failed ? 'text-accent-strong' : 'text-text-primary'}`}
        >
          {syncJob ? STATUS_GLYPH[syncJob.status] : '·'}
        </span>
        <span className="truncate text-body-md text-text-primary transition-colors group-hover/source:text-accent-strong">
          {source.title}
        </span>
        <span
          className={`flex flex-wrap items-center justify-end gap-x-2 ${META}`}
        >
          <span className={failed ? 'text-accent-strong' : undefined}>
            {syncJob ? syncJob.status : 'no job'}
          </span>
          {syncJob && <SyncJobProgress syncJob={syncJob} />}
          {source.publishedPostId && (
            <>
              <span aria-hidden="true">·</span>
              <span>게시됨</span>
            </>
          )}
        </span>
        <span className={`col-start-2 truncate ${META}`}>
          {source.externalSourceId}
        </span>
        <span className={`text-right ${META}`}>
          {formatBytes(source.sizeBytes)} · {formatDate(source.updatedAt)}
        </span>
      </Link>
    </li>
  );
}
