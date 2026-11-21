import { type FormEvent, type Ref } from 'react';
import { AI_SUMMARY_NOTICE, type AiSummary, type PostSummary } from '@/entities/post';
import { AiMark, ArchiveIndex, EmptyState, EndOfList, ErrorState } from '@/shared/ui';

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
      sentinelRef: Ref<HTMLDivElement>;
    };

function formatViews(count: number) {
  return `${count.toLocaleString('en-US')} ${count === 1 ? 'view' : 'views'}`;
}

const SUMMARY_ROW = 'relative mt-2 grid grid-cols-[20px_minmax(0,1fr)] items-start margin-label:block';

const MARK_IN_MARGIN = 'mt-[3px] -ml-0.5 margin-label:absolute margin-label:top-0 margin-label:-left-6 margin-label:ml-0';

/** 요약 줄 수는 정해져 있지 않다. 줄을 자르지 않고 받은 만큼 쌓는다. 번호는 상세 요약과 같이 두 줄 이상일 때만 붙인다. */
function SummaryLines({ summary }: { summary: AiSummary }) {
  if (summary.status === 'pending' || summary.status === 'failed') {
    return (
      <span className={SUMMARY_ROW}>
        <AiMark twinkling={summary.status === 'pending'} className={`${MARK_IN_MARGIN} text-text-muted opacity-60`} />
        <span
          className={`font-mono text-label-sm leading-[22px] tracking-normal ${summary.status === 'pending' ? 'shimmer-text' : 'text-text-muted'}`}
        >
          {AI_SUMMARY_NOTICE[summary.status]}
        </span>
      </span>
    );
  }

  const numbered = summary.lines.length > 1;

  return (
    <span className={SUMMARY_ROW}>
      <AiMark className={`${MARK_IN_MARGIN} text-accent`} />
      <span className="flex min-w-0 flex-col gap-1">
        {summary.lines.map((line, index) => (
          <span
            key={index}
            className={numbered ? 'grid grid-cols-[24px_minmax(0,1fr)] items-start margin-label:grid-cols-[28px_minmax(0,1fr)]' : 'block'}
          >
            {numbered && (
              <span aria-hidden="true" className="font-mono text-label-sm leading-[22px] tracking-normal tabular-nums text-text-muted/70">
                {String(index + 1).padStart(2, '0')}
              </span>
            )}
            <span className="text-body-sm text-text-secondary">{line}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

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
        <h1 className="text-headline-md text-text-primary">Posts</h1>

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
          {state.status === 'loading' ? null : state.status === 'error' ? (
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
                  meta: [post.similarity != null && `${post.similarity}% match`, formatViews(post.viewCount)].filter(
                    (item) => typeof item === 'string',
                  ),
                  detail: isSearching ? (
                    post.snippet && (
                      <span className="mt-2 line-clamp-2 text-body-md text-text-muted">
                        <Highlighted text={post.snippet} query={highlight} />
                      </span>
                    )
                  ) : (
                    <SummaryLines summary={post.summary} />
                  ),
                }))}
              />
              <div ref={state.sentinelRef} className="h-px" aria-hidden="true" />
              {!state.hasNextPage && <EndOfList label="End of posts" className={ARCHIVE_SPACING} />}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
