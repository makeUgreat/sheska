import { forwardRef, type Ref } from 'react';
import { type PostSummary } from '@/api/client';
import { PostCard } from '@/components/post/post-card';
import { PostSectionHeader } from '@/components/post/post-section-header';
import { EndOfPosts, PostsLoading } from '@/components/post/posts-loading';
import { StatusMessage } from '@/components/ui/status-message';

const FEATURED_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBmfuDAS_7r95iDVqY4IEj-VUVoDfutREwgjxIQQKPSqxxSd-VlK1V2bVlvvGSYHFtq5NgwGZUIpzh-pPqOdzxOWjIuEmgNbZn0mqlpScuHk8Z4mDk5yZjZYvAOzGjKGG1F67WKXB2J05BmnG7OEwgdzGoZIJtDpHVRPBoyijB8n6ADBul5bZ-GQLw5WjSoXDR98pkpFMAIcpCE8rcwEXwi-hL0XrOgwVf2CkCFTp1pa7RfKdLdqrQPQFlC67ukxJK7WgRSaOPhwY2Q';

export const PostsListSection = forwardRef<
  HTMLElement,
  {
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
    onResetToTop: () => void;
  }
>(function PostsListSection(
  {
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
    onResetToTop,
  },
  ref,
) {
  return (
    <section
      id="posts"
      ref={ref}
      className="min-h-screen scroll-mt-0 border-t border-outline-variant/10 bg-page-background px-4 py-20 outline-none"
      tabIndex={-1}
    >
      <div className="mx-auto max-w-[800px]">
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={onResetToTop}
            className="font-mono text-xs font-medium uppercase tracking-widest text-text-muted transition-colors hover:text-accent"
          >
            Back to top
          </button>
        </div>
        <PostSectionHeader title="Latest Notes & Essays">
          A collection of evolving thoughts on software, design systems, and the
          intersection of code and creativity.
        </PostSectionHeader>
        <div className="mb-12 border-b border-outline-variant/20 pb-4">
          <input
            type="search"
            aria-label="Search posts"
            placeholder="What's new in the garden?"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-full bg-transparent font-mono text-base text-text-primary caret-accent outline-none placeholder:text-text-muted"
          />
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
});

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
