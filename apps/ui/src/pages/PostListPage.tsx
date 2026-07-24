import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteListPosts, useInfiniteSearchPosts } from '@/api/queries';
import { type PostSummary } from '@/api/client';
import { LoadingDots } from '@/components/ui/loading-dots';
import { StatusMessage } from '@/components/ui/status-message';
import { TerminalWindow } from '@/components/post/terminal-window';
import { PostCard } from '@/components/post/post-card';
import { PostSectionHeader } from '@/components/post/post-section-header';

const FEATURED_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBmfuDAS_7r95iDVqY4IEj-VUVoDfutREwgjxIQQKPSqxxSd-VlK1V2bVlvvGSYHFtq5NgwGZUIpzh-pPqOdzxOWjIuEmgNbZn0mqlpScuHk8Z4mDk5yZjZYvAOzGjKGG1F67WKXB2J05BmnG7OEwgdzGoZIJtDpHVRPBoyijB8n6ADBul5bZ-GQLw5WjSoXDR98pkpFMAIcpCE8rcwEXwi-hL0XrOgwVf2CkCFTp1pa7RfKdLdqrQPQFlC67ukxJK7WgRSaOPhwY2Q';

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
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
    <main>
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-page-background px-4 pb-24 pt-12">
        <div className="mb-12">
          <h1 className="select-none bg-gradient-to-r from-[#374151] to-black bg-clip-text text-[88px] font-bold leading-none tracking-tighter text-transparent sm:text-[120px] md:text-[180px]">
            HASH
          </h1>
        </div>

        <div className="z-10 w-full max-w-container-terminal px-0 sm:px-6">
          <TerminalWindow
            prompt={
              <>
                <div className="mb-4">
                  <span className="text-secondary">visitor@garden:~$</span>{' '}
                  <span className="text-white">
                    garden-cli init --mode=explorative
                  </span>
                </div>
                <div className="mb-4 text-tertiary opacity-80">
                  Initializing Digital Garden context...
                  <br />
                  Loading semantic nodes...
                  <br />
                  Ready for input.
                </div>
              </>
            }
            cursor={
              <div className="mt-2 flex items-center">
                <span className="text-secondary">visitor@garden:~$</span>
                <span className="ml-2 text-white">Y</span>
                <span className="ml-1 h-5 w-2 animate-pulse bg-accent" />
              </div>
            }
          >
            <div className="mb-4">
              <span className="text-secondary">visitor@garden:~$</span>{' '}
              <input
                type="search"
                aria-label="Search posts"
                placeholder="What's new in the garden?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-[min(100%,34rem)] bg-transparent text-white caret-accent outline-none placeholder:text-white"
              />
            </div>
            <div className="mb-4 text-accent">
              Analyzing recent thought logs...
              <br />- {posts.length} notes found in /posts
              <br />- Updated reading index for &quot;Generative UI&quot;
              <br />- Technical snippets synced via CLI
              <br />
              <br />
              Shall I display the latest entries? (Y/n)
            </div>
          </TerminalWindow>
        </div>

        <a
          href="#posts"
          className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-on-secondary/30 animate-bounce"
        >
          <span className="font-mono text-xs font-medium uppercase tracking-widest">
            Scroll to explore
          </span>
          <span className="text-xl leading-none">v</span>
        </a>
      </section>

      <section
        id="posts"
        className="border-t border-outline-variant/10 bg-page-background px-4 py-20"
      >
        <div className="mx-auto max-w-[800px]">
          <PostSectionHeader title="Latest Notes & Essays">
            A collection of evolving thoughts on software, design systems, and
            the intersection of code and creativity.
          </PostSectionHeader>

          {isLoading ? (
            <StatusMessage tone="loading">Loading...</StatusMessage>
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
              <div ref={sentinelRef} />
              {isFetchingNextPage && <LoadingMore />}
              {!hasNextPage && posts.length > 0 && (
                <LoadingMore label="End of posts" />
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function LoadingMore({ label = 'Loading more posts...' }: { label?: string }) {
  return (
    <div className="mt-24 flex flex-col items-center gap-4 border-t border-outline-variant/10 pt-12">
      <LoadingDots />
      <span className="font-mono text-xs font-medium uppercase tracking-widest text-text-muted opacity-60">
        {label}
      </span>
    </div>
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
