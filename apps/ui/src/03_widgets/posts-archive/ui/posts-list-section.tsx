import { type FormEvent, type Ref } from 'react';
import { PostCard, type PostSummary } from '@/entities/post';
import { StatusMessage } from '@/shared/ui';
import { EndOfPosts, PostsLoading } from './posts-loading';

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
        <form className="group mb-12" role="search" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 border-b border-accent/30 pb-2 transition-colors focus-within:border-accent">
            <label
              htmlFor="posts-archive-search"
              className="shrink-0 font-mono text-xs font-bold uppercase tracking-widest text-accent"
            >
              Search by title or content:
            </label>
            <input
              id="posts-archive-search"
              type="search"
              placeholder="Search title or content"
              value={search.query}
              onChange={(e) => search.onQueryChange(e.target.value)}
              className="w-full border-0 bg-transparent p-0 font-mono text-sm text-accent caret-accent outline-none placeholder:text-accent/40 focus:ring-0"
            />
            <span className="h-4 w-2 shrink-0 animate-pulse bg-accent" />
            <button
              type="submit"
              className="shrink-0 font-mono text-xs font-bold uppercase text-accent/70 transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              Search
            </button>
          </div>
          {isSearching && search.mode !== null && (
            <div className="mt-3 font-mono text-xs font-bold uppercase tracking-widest text-text-muted">
              Search mode:{' '}
              <span className="text-accent">
                {search.mode === 'smart' ? 'Smart' : 'Basic'}
              </span>
            </div>
          )}
        </form>

        {state.status === 'loading' ? (
          <PostsLoading label="Loading posts..." />
        ) : state.status === 'error' ? (
          <StatusMessage tone="error">
            Error: {state.error.message}
          </StatusMessage>
        ) : state.status === 'empty' ? (
          <StatusMessage tone="empty">
            {isSearching
              ? `No results for "${search.normalizedQuery}".`
              : 'No posts yet.'}
          </StatusMessage>
        ) : (
          <>
            <PostList
              posts={state.posts}
              highlight={isSearching ? search.normalizedQuery : ''}
            />
            <div ref={state.sentinelRef} className="h-px" aria-hidden="true" />
            {state.isFetchingNextPage && <PostsLoading />}
            {!state.hasNextPage && <EndOfPosts />}
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
