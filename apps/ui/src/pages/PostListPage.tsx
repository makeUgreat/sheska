import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteListPosts } from '@/api/queries';

export function PostListPage() {
  const [searchParams] = useSearchParams();
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteListPosts(limit);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

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
      ) : posts.length === 0 ? (
        <p className="text-gray-500">No posts yet.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {posts.map((p) => (
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
          <div ref={sentinelRef} />
          {isFetchingNextPage && (
            <p className="mt-4 text-center text-sm text-gray-500">Loading...</p>
          )}
        </>
      )}
    </main>
  );
}
