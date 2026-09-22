import { type FormEvent, type Ref } from 'react';
import { Link } from 'react-router-dom';
import { PostCard, type PostSummary } from '@/entities/post';
import { EmptyState, EndOfList, ErrorState, LoadingState } from '@/shared/ui';

const ARCHIVE_SPACING = 'mt-24 pt-12';

export type PostsSearchMode = 'smart' | 'basic' | null;

export type PostsListState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'empty' }
  | {
      status: 'success';
      posts: PostSummary[];
      hasNextPage: boolean;
      isFetchingNextPage: boolean;
      sentinelRef: Ref<HTMLDivElement>;
    };

export function PostsListSection({
  search,
  state,
}: {
  search: {
    query: string;
    onQueryChange: (query: string) => void;
    onQuerySubmit: () => void;
    normalizedQuery: string;
    mode: PostsSearchMode;
  };
  state: PostsListState;
}) {
  const isSearching = search.normalizedQuery.length > 0;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    search.onQuerySubmit();
  }

  return (
    <section
      id="posts"
      className="min-h-screen scroll-mt-0 bg-white px-4 py-20 outline-none"
      tabIndex={-1}
    >
      <div className="mx-auto max-w-measure">
        <div className="mb-6 flex justify-end">
          <Link
            to="/"
            className="shrink-0 font-mono text-label-sm uppercase text-text-muted transition-colors hover:text-accent-strong"
          >
            Back to top
          </Link>
        </div>
        <form className="group mb-12" role="search" onSubmit={handleSubmit}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-accent/30 pb-2 transition-colors focus-within:border-accent">
            <label
              htmlFor="posts-archive-search"
              className="shrink-0 font-mono text-label-sm font-bold uppercase text-accent-strong"
            >
              Search by title or content:
            </label>
            <div className="flex min-w-[12rem] flex-1 items-center gap-2">
              <input
                id="posts-archive-search"
                type="search"
                placeholder="Search title or content"
                value={search.query}
                onChange={(e) => search.onQueryChange(e.target.value)}
                className="w-full min-w-0 border-0 bg-transparent p-0 font-mono text-code-snippet text-accent-strong caret-accent outline-none placeholder:text-text-muted focus:ring-0"
              />
              <span className="h-4 w-2 shrink-0 animate-pulse bg-accent" />
              <button
                type="submit"
                className="shrink-0 font-mono text-xs font-bold uppercase text-accent-strong/85 transition-colors hover:text-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                Search
              </button>
            </div>
          </div>
          {isSearching && search.mode !== null && (
            <div className="mt-3 font-mono text-label-sm font-bold uppercase text-text-muted">
              Search mode:{' '}
              <span className="text-accent-strong">
                {search.mode === 'smart' ? 'Smart' : 'Basic'}
              </span>
            </div>
          )}
        </form>

        {state.status === 'loading' ? (
          <LoadingState className={ARCHIVE_SPACING} />
        ) : state.status === 'error' ? (
          <ErrorState error={state.error} />
        ) : state.status === 'empty' ? (
          isSearching ? (
            <EmptyState
              variant="search"
              query={search.normalizedQuery}
              className={ARCHIVE_SPACING}
            />
          ) : (
            <EmptyState variant="list" className={ARCHIVE_SPACING} />
          )
        ) : (
          <>
            <PostList
              posts={state.posts}
              highlight={isSearching ? search.normalizedQuery : ''}
            />
            <div ref={state.sentinelRef} className="h-px" aria-hidden="true" />
            {state.isFetchingNextPage && (
              <LoadingState className={ARCHIVE_SPACING} />
            )}
            {!state.hasNextPage && (
              <EndOfList label="End of posts" className={ARCHIVE_SPACING} />
            )}
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
      {posts.map((p) => (
        <li key={p.postId}>
          <PostCard post={p} highlight={highlight} />
        </li>
      ))}
    </ul>
  );
}
