import { type Ref } from 'react';
import { PostCard, type PostSummary } from '@/entities/post';
import { StatusMessage } from '@/shared/ui';
import { EndOfPosts, PostsLoading } from './posts-loading';

const FEATURED_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBmfuDAS_7r95iDVqY4IEj-VUVoDfutREwgjxIQQKPSqxxSd-VlK1V2bVlvvGSYHFtq5NgwGZUIpzh-pPqOdzxOWjIuEmgNbZn0mqlpScuHk8Z4mDk5yZjZYvAOzGjKGG1F67WKXB2J05BmnG7OEwgdzGoZIJtDpHVRPBoyijB8n6ADBul5bZ-GQLw5WjSoXDR98pkpFMAIcpCE8rcwEXwi-hL0XrOgwVf2CkCFTp1pa7RfKdLdqrQPQFlC67ukxJK7WgRSaOPhwY2Q';

export function PostsListSection({
  query,
  onQueryChange,
  isLoading,
  error,
  posts,
  isSearching,
  normalizedQuery,
  hasNextPage,
  isFetchingNextPage,
  sentinelRef,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  isLoading: boolean;
  error: Error | null;
  posts: PostSummary[];
  isSearching: boolean;
  normalizedQuery: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  sentinelRef: Ref<HTMLDivElement>;
}) {
  return (
    <section
      id="posts"
      className="min-h-screen scroll-mt-0 bg-white px-4 py-20 outline-none"
      tabIndex={-1}
    >
      <div className="mx-auto max-w-[720px]">
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="shrink-0 font-mono text-xs font-medium uppercase tracking-widest text-text-muted transition-colors hover:text-accent"
          >
            Back to top
          </button>
        </div>
        <div className="group mb-12">
          <div className="flex items-center gap-2 border-b border-accent/30 pb-2 transition-colors focus-within:border-accent">
            <label
              htmlFor="posts-archive-search"
              className="shrink-0 font-mono text-xs font-bold uppercase tracking-widest text-accent"
            >
              [SEARCH]:
            </label>
            <input
              id="posts-archive-search"
              type="search"
              aria-label="Search posts"
              placeholder=". . ."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="w-full border-0 bg-transparent p-0 font-mono text-sm text-accent caret-accent outline-none placeholder:text-accent/40 focus:ring-0"
            />
            <span className="h-4 w-2 shrink-0 animate-pulse bg-accent" />
            <span
              aria-hidden="true"
              className="shrink-0 font-mono text-xs font-bold uppercase text-accent/40 transition-colors group-focus-within:text-accent"
            >
              find
            </span>
          </div>
        </div>

        {isLoading ? (
          <PostsLoading label="Loading posts..." />
        ) : error ? (
          <StatusMessage tone="error">Error: {error.message}</StatusMessage>
        ) : posts.length === 0 ? (
          <StatusMessage tone="empty">
            {isSearching
              ? `No results for "${normalizedQuery}".`
              : 'No posts yet.'}
          </StatusMessage>
        ) : (
          <>
            <PostList
              posts={posts}
              highlight={isSearching ? normalizedQuery : ''}
            />
            <div ref={sentinelRef} className="h-px" />
            {isFetchingNextPage && <PostsLoading />}
            {!hasNextPage && posts.length > 0 && <EndOfPosts />}
          </>
        )}
      </div>
    </section>
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
    <ul className="space-y-12">
      {posts.map((p, index) => (
        <li key={p.postId}>
          <PostCard
            post={p}
            highlight={highlight}
            thumbnailUrl={index % 3 === 2 ? FEATURED_IMAGE_URL : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
