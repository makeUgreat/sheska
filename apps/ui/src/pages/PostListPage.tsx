import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useListPosts, useSearchPosts } from '@/api/queries';
import { type PostSummary } from '@/api/client';

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function PostListPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const isSearching = debouncedQuery.length >= 2;

  const listResult = useListPosts();
  const searchResult = useSearchPosts(debouncedQuery);

  const { data, isLoading, error } = isSearching ? searchResult : listResult;

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
      ) : data?.posts.length === 0 ? (
        <p className="text-gray-500">
          {isSearching
            ? `No results for "${debouncedQuery}".`
            : 'No posts yet.'}
        </p>
      ) : (
        <PostList posts={data?.posts ?? []} />
      )}
    </main>
  );
}

function PostList({ posts }: { posts: PostSummary[] }) {
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
            {p.title}
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
