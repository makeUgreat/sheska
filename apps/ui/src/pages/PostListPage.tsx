import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteListPosts, useInfiniteSearchPosts } from '@/api/queries';
import { type PostSummary } from '@/api/client';

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function HighlightedTitle({ title, query }: { title: string; query: string }) {
  if (!query) return <>{title}</>;

  const index = title.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{title}</>;

  return (
    <>
      {title.slice(0, index)}
      <mark className="bg-yellow-200 text-gray-900">
        {title.slice(index, index + query.length)}
      </mark>
      {title.slice(index + query.length)}
    </>
  );
}

export function PostListPage() {
  const [searchParams] = useSearchParams();
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const normalizedQuery = debouncedQuery.trim();
  const isSearching = normalizedQuery.length >= 1;

  const listResult = useInfiniteListPosts(limit);
  const searchResult = useInfiniteSearchPosts(normalizedQuery, limit);
  const result = isSearching ? searchResult : listResult;
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = result;

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
      <input
        type="search"
        placeholder="Search posts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-6 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
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
        <p className="text-gray-500">
          {isSearching
            ? `No results for "${normalizedQuery}".`
            : 'No posts yet.'}
        </p>
      ) : (
        <>
          <PostList
            posts={posts}
            highlight={isSearching ? normalizedQuery : ''}
          />
          <div ref={sentinelRef} />
          {isFetchingNextPage && (
            <p className="mt-4 text-center text-sm text-gray-500">Loading...</p>
          )}
        </>
      )}
    </main>
  );
}

function PostList({
  posts,
  highlight,
}: {
  posts: PostSummary[];
  highlight: string;
}) {
  return (
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
            <HighlightedTitle title={p.title} query={highlight} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{p.viewCount} views</span>
            <span className="text-sm text-gray-400">
              {new Date(p.updatedAt).toLocaleString()}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
