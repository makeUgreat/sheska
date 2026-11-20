import { type FormEvent, type Ref } from 'react';
import { type PostSummary } from '@/entities/post';
import { ArchiveIndex, EmptyState, EndOfList, ErrorState, LoadingState } from '@/shared/ui';

const ARCHIVE_SPACING = 'mt-16';

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

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-accent/15 text-inherit">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

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
  const highlight = isSearching ? search.normalizedQuery : '';

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    search.onQuerySubmit();
  }

  return (
    <section id="posts" className="px-4 pb-32 pt-16">
      <div className="mx-auto max-w-measure">
        <h1 className="text-body-md font-semibold text-text-primary">Posts</h1>

        <form className="mt-6" role="search" onSubmit={handleSubmit}>
          <label htmlFor="posts-archive-search" className="sr-only">
            Search posts by title or content
          </label>
          <div className="flex items-center gap-3 border-b border-outline-variant/25 transition-colors focus-within:border-accent">
            <input
              id="posts-archive-search"
              type="search"
              placeholder="Search title or content"
              value={search.query}
              onChange={(e) => search.onQueryChange(e.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent py-2 text-body-md text-text-primary caret-accent outline-none placeholder:text-text-muted"
            />
            <button
              type="submit"
              className="shrink-0 font-mono text-label-sm tracking-normal text-text-muted transition-colors hover:text-accent-strong focus-visible:text-accent-strong focus-visible:outline-none"
            >
              Search
            </button>
          </div>
          {isSearching && search.mode !== null && (
            <p className="mt-2 font-mono text-label-sm tracking-normal text-text-muted">
              {search.mode === 'smart' ? 'Smart search' : 'Basic search'}
            </p>
          )}
        </form>

        <div className="mt-10">
          {state.status === 'loading' ? (
            <LoadingState className={ARCHIVE_SPACING} />
          ) : state.status === 'error' ? (
            <ErrorState error={state.error} />
          ) : state.status === 'empty' ? (
            isSearching ? (
              <EmptyState variant="search" query={search.normalizedQuery} className={ARCHIVE_SPACING} />
            ) : (
              <EmptyState variant="list" className={ARCHIVE_SPACING} />
            )
          ) : (
            <>
              <ArchiveIndex
                entries={state.posts.map((post) => ({
                  id: post.postId,
                  href: `/posts/${post.postId}`,
                  title: <Highlighted text={post.title} query={highlight} />,
                  date: post.createdAt,
                  note: post.similarity != null && `${post.similarity}% match`,
                  detail: post.snippet && <Highlighted text={post.snippet} query={highlight} />,
                }))}
              />
              <div ref={state.sentinelRef} className="h-px" aria-hidden="true" />
              {state.isFetchingNextPage && <LoadingState className={ARCHIVE_SPACING} />}
              {!state.hasNextPage && <EndOfList label="End of posts" className={ARCHIVE_SPACING} />}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
