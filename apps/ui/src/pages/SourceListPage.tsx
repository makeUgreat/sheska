import { Link } from 'react-router-dom';
import { useListSources } from '@/api/queries';
import { type SyncJobSummary } from '@/api/client';

function SyncJobBadge({ syncJob }: { syncJob: SyncJobSummary | null }) {
  if (!syncJob) {
    return <span className="text-xs text-gray-400">no job</span>;
  }

  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  } as const;

  const style = styles[syncJob.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {syncJob.status}
    </span>
  );
}

export function SourceListPage() {
  const { data, isLoading, error } = useListSources();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Sources</h1>
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : error ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Error: {error.message}
        </p>
      ) : data?.sources.length === 0 ? (
        <p className="text-gray-500">No sources yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {data?.sources.map((s) => (
            <li
              key={s.sourceId}
              className="flex items-center justify-between px-4 py-3"
            >
              <Link
                to={`/sources/${s.sourceId}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {s.externalSourceId}
              </Link>
              <div className="flex items-center gap-3">
                <SyncJobBadge syncJob={s.latestSyncJob} />
                <span className="text-sm text-gray-500">
                  {s.sizeBytes} bytes · {new Date(s.updatedAt).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
