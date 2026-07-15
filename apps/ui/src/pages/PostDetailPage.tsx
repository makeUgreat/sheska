import { Link, useParams } from 'react-router-dom';
import { usePost } from '@/api/queries';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: post, isLoading, error } = usePost(id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/posts"
        className="mb-6 inline-block text-sm text-gray-500 hover:text-gray-900"
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
        <>
          <h1 className="mb-6 text-2xl font-bold text-gray-900">
            {post.title}
          </h1>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="font-medium text-gray-500">ID</dt>
            <dd className="font-mono text-gray-900">{post.postId}</dd>
            <dt className="font-medium text-gray-500">Source ID</dt>
            <dd className="font-mono text-gray-900">{post.sourceId}</dd>
            <dt className="font-medium text-gray-500">View Count</dt>
            <dd className="text-gray-900">{post.viewCount}</dd>
            <dt className="font-medium text-gray-500">Created</dt>
            <dd className="text-gray-900">
              {new Date(post.createdAt).toLocaleString()}
            </dd>
            <dt className="font-medium text-gray-500">Updated</dt>
            <dd className="text-gray-900">
              {new Date(post.updatedAt).toLocaleString()}
            </dd>
          </dl>
        </>
      ) : null}
    </main>
  );
}
