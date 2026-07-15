import { Link, useParams } from 'react-router-dom';
import { usePost } from '@/api/queries';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: post, isLoading, error } = usePost(id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/posts"
        className="mb-6 inline-block text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        ← Back to posts
      </Link>
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : error ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Error: {error.message}
        </p>
      ) : post ? (
        <article>
          <header className="mb-8 border-b border-gray-200 pb-6">
            <p className="mb-2 text-xs font-semibold uppercase text-blue-600">
              Post
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="break-words text-3xl font-bold text-gray-950">
                {post.title}
              </h1>
              <div className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
                <div className="text-2xl font-semibold text-gray-950">
                  {post.viewCount}
                </div>
                <div className="text-xs font-medium uppercase text-gray-500">
                  views
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Updated {new Date(post.updatedAt).toLocaleString()}
            </p>
          </header>

          <dl className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Post ID
              </dt>
              <dd className="mt-1 break-all font-mono text-sm text-gray-900">
                {post.postId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Source ID
              </dt>
              <dd className="mt-1 break-all font-mono text-sm text-gray-900">
                {post.sourceId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                View Count
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {post.viewCount} views
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Created
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(post.createdAt).toLocaleString()}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase text-gray-500">
                Updated
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(post.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </article>
      ) : null}
    </main>
  );
}
