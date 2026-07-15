import { Link } from 'react-router-dom';
import { useListPosts } from '@/api/queries';

export function PostListPage() {
  const { data, isLoading, error } = useListPosts();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Posts</h1>
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : error ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Error: {error.message}
        </p>
      ) : data?.posts.length === 0 ? (
        <p className="text-gray-500">No posts yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {data?.posts.map((p) => (
            <li
              key={p.postId}
              className="flex items-center justify-between px-4 py-3"
            >
              <Link
                to={`/posts/${p.postId}`}
                className="font-medium text-gray-900 hover:text-blue-600"
              >
                {p.title}
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {p.viewCount} views
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(p.updatedAt).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
