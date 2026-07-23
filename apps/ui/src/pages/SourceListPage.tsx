import { Link } from 'react-router-dom';
import { useListSources } from '@/api/queries';
import { type SyncJobSummary } from '@/api/client';
import { SyncJobBadge, SyncJobProgress } from '@/components/sync-job-status';

function SourceSyncJobStatus({ syncJob }: { syncJob: SyncJobSummary | null }) {
  if (!syncJob) {
    return (
      <span className="font-['JetBrains_Mono'] text-xs text-[#43474f]">
        no job
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SyncJobBadge status={syncJob.status} />
      <SyncJobProgress syncJob={syncJob} />
    </div>
  );
}

function PublishedBadge() {
  return (
    <span className="rounded bg-[#e06c75] px-2 py-0.5 font-['JetBrains_Mono'] text-xs font-medium text-white">
      게시됨
    </span>
  );
}

export function SourceListPage() {
  const { data, isLoading, error } = useListSources();

  return (
    <main className="min-h-screen bg-white px-4 py-20">
      <div className="mx-auto max-w-[800px]">
        <div className="mb-16">
          <p className="font-['JetBrains_Mono'] text-xs font-medium uppercase tracking-widest text-[#e06c75]">
            /sources
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-[#101319] sm:text-5xl">
            Sources
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[#43474f]">
            Source documents available for indexing, syncing, and publishing.
          </p>
        </div>

        {isLoading ? (
          <p className="font-['JetBrains_Mono'] text-xs font-medium uppercase tracking-widest text-[#dcc0c0]">
            Loading...
          </p>
        ) : error ? (
          <p
            role="alert"
            className="rounded bg-[#93000a] px-4 py-3 font-['JetBrains_Mono'] text-sm text-[#ffdad6]"
          >
            Error: {error.message}
          </p>
        ) : data?.sources.length === 0 ? (
          <p className="text-base leading-relaxed text-[#43474f]">
            No sources yet.
          </p>
        ) : (
          <ul className="divide-y divide-[#5642421a] border-y border-[#5642421a]">
            {data?.sources.map((s) => (
              <li
                key={s.sourceId}
                className="group relative py-6 pl-5 before:absolute before:left-0 before:top-6 before:h-[calc(100%-48px)] before:w-0.5 before:bg-transparent hover:before:bg-[#e06c75]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    to={`/sources/${s.sourceId}`}
                    className="break-words text-2xl font-semibold leading-snug text-[#101319] transition-colors group-hover:text-[#e06c75]"
                  >
                    {s.externalSourceId}
                  </Link>
                  <div className="flex flex-wrap items-center gap-3">
                    {s.publishedPostId && <PublishedBadge />}
                    <SourceSyncJobStatus syncJob={s.latestSyncJob} />
                    <span className="font-['JetBrains_Mono'] text-xs font-medium uppercase tracking-widest text-[#43474f]">
                      {s.sizeBytes} bytes ·{' '}
                      {new Date(s.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
