import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteListPosts, useInfiniteSearchPosts } from '@/api/queries';
import { type PostSummary } from '@/api/client';

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

function HighlightedTitle({ title, query }: { title: string; query: string }) {
  if (!query) return <>{title}</>;

  const index = title.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{title}</>;

  return (
    <>
      {title.slice(0, index)}
      <mark className="bg-[#e06c75] text-white">
        {title.slice(index, index + query.length)}
      </mark>
      {title.slice(index + query.length)}
    </>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

        <div className="z-10 w-full max-w-[1000px] px-0 sm:px-6">
          <div className="overflow-hidden rounded-lg border border-white/5 bg-surface shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/5 bg-[#1a1f26] px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-terminal-red" />
              <span className="h-3 w-3 rounded-full bg-terminal-yellow" />
              <span className="h-3 w-3 rounded-full bg-terminal-green" />
              <span className="ml-4 font-mono text-[13px] leading-[18px] text-white/40">
                zsh - 80x24
              </span>
            </div>
            <div className="min-h-[450px] p-6 font-mono text-[18px] font-medium leading-relaxed text-[#e06c75] sm:text-[24px] sm:leading-8">
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
              <div className="mb-4">
                <span className="text-secondary">visitor@garden:~$</span>{' '}
                <input
                  type="search"
                  aria-label="Search posts"
                  placeholder="What's new in the garden?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-[min(100%,34rem)] bg-transparent text-white caret-[#e06c75] outline-none placeholder:text-white"
                />
              </div>
              <div className="mb-4 text-[#e06c75]">
                Analyzing recent thought logs...
                <br />- {posts.length} notes found in /posts
                <br />- Updated reading index for &quot;Generative UI&quot;
                <br />- Technical snippets synced via CLI
                <br />
                <br />
                Shall I display the latest entries? (Y/n)
              </div>
              <div className="mt-2 flex items-center">
                <span className="text-secondary">visitor@garden:~$</span>
                <span className="ml-2 text-white">Y</span>
                <span className="ml-1 h-5 w-2 animate-pulse bg-[#e06c75]" />
              </div>
            </div>
          </div>
        </div>

        <a
          href="#posts"
          className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-on-secondary/30"
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
          <header className="mb-16">
            <h2 className="sr-only">Posts</h2>
            <h2 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl">
              Latest Notes &amp; Essays
            </h2>
            <p className="text-lg leading-relaxed text-text-secondary">
              A collection of evolving thoughts on software, design systems, and
              the intersection of code and creativity.
            </p>
          </header>

          {isLoading ? (
            <p className="font-mono text-xs font-medium uppercase tracking-widest text-text-muted">
              Loading...
            </p>
          ) : error ? (
            <p
              role="alert"
              className="rounded bg-error-container px-4 py-3 font-mono text-sm text-on-error-container"
            >
              Error: {error.message}
            </p>
          ) : posts.length === 0 ? (
            <p className="text-base leading-relaxed text-text-secondary">
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
      <div className="flex gap-1.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#e06c75] [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#e06c75] [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#e06c75]" />
      </div>
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
          <article className="group -mx-6 rounded-lg p-6 transition-all duration-300 hover:bg-surface-container-lowest">
            <div
              className={
                index % 3 === 2
                  ? 'grid gap-8 md:grid-cols-[1fr_200px]'
                  : 'flex flex-col gap-2'
              }
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-4 font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
                  <span className="font-bold">{formatDate(p.updatedAt)}</span>
                  <span className="h-1 w-1 rounded-full bg-outline-variant" />
                  <span>{p.viewCount} views</span>
                  <span className="h-1 w-1 rounded-full bg-outline-variant" />
                  <span className="rounded bg-[#e06c75] px-2 py-0.5 font-mono text-[13px] normal-case leading-[18px] text-white">
                    #POST
                  </span>
                </div>
                <Link to={`/posts/${p.postId}`}>
                  <h3 className="text-2xl font-semibold leading-snug text-text-primary transition-colors group-hover:text-[#e06c75]">
                    <HighlightedTitle title={p.title} query={highlight} />
                  </h3>
                </Link>
                <p className="line-clamp-2 text-base leading-relaxed text-text-secondary">
                  A saved note from the garden index, ready for focused reading
                  and revision.
                </p>
                <Link
                  to={`/posts/${p.postId}`}
                  className="mt-2 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-[#e06c75]"
                >
                  Read Note
                  <span className="transition-transform group-hover:translate-x-1">
                    -&gt;
                  </span>
                </Link>
              </div>

              {index % 3 === 2 && (
                <div className="hidden md:block">
                  <div className="aspect-square w-full overflow-hidden rounded bg-surface-container-low">
                    <img
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={FEATURED_IMAGE_URL}
                    />
                  </div>
                </div>
              )}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
