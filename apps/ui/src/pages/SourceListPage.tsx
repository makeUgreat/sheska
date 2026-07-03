import { Link } from 'react-router-dom';
import { useListSources } from '@/api/queries';

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
              <span className="text-sm text-gray-500">
                {s.sizeBytes} bytes · {new Date(s.updatedAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
