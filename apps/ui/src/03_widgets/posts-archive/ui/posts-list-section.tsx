import { type CSSProperties, type FormEvent, type Ref, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { AI_SUMMARY_NOTICE, type AiSummary, type PostSeries, type PostSummary } from '@/entities/post';
import { findProject, type Project, PROJECTS, ProjectTag } from '@/entities/project';
import { type RevealPhase, useStagedReveal } from '@/shared/lib';
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

type PostsSearch = {
  query: string;
  onQueryChange: (query: string) => void;
  onQuerySubmit: () => void;
  onClose: () => void;
  normalizedQuery: string;
  mode: PostsSearchMode;
};

type PostsFilter = {
  project: string | null;
  onProjectChange: (project: string | null) => void;
  listedProject: string | null;
  switching: boolean;
};

const SUMMARY_ROW = 'relative mt-1 grid grid-cols-[20px_minmax(0,1fr)] items-start margin-label:block';

const MARK_IN_MARGIN = 'mt-[3px] -ml-0.5 margin-label:absolute margin-label:top-0 margin-label:-left-6 margin-label:ml-0';

/** 처음 보는 목록에서 요약이 한꺼번에 드러나지 않게 붙잡는 시간을 항목마다 흔든다. */
const SUMMARY_HOLD_MS = 450;
const SUMMARY_HOLD_JITTER_MS = 600;
const LINE_STAGGER_MS = 140;

function delayMs(ms: number): CSSProperties {
  return { animationDelay: `${ms}ms` };
}

/**
 * 요약 줄 수는 정해져 있지 않다. 줄을 자르지 않고 받은 만큼 쌓는다.
 * 이미 만든 요약도 처음 볼 때는 작성 중처럼 잠깐 막대를 보인 뒤 드러낸다.
 */
function SummaryLines({ postId, summary }: { postId: string; summary: AiSummary }) {
  const { ref, phase } = useStagedReveal(postId, {
    ready: summary.status === 'ready',
    holdMs: SUMMARY_HOLD_MS,
    jitterMs: SUMMARY_HOLD_JITTER_MS,
  });
  const shown = summary.status === 'ready' && phase !== 'holding';
  const writing = summary.status === 'pending' || (summary.status === 'ready' && phase === 'holding');
  const pop = phase === 'revealing' ? 'animate-mark-pop motion-reduce:animate-none' : '';

  return (
    <span ref={ref} className={SUMMARY_ROW}>
      <AiMark twinkling={writing} className={`${MARK_IN_MARGIN} ${shown ? `text-accent ${pop}` : 'text-text-muted opacity-60'}`} />
      <span className="relative block min-w-0">
        <SummaryBody summary={summary} phase={phase} />
      </span>
    </span>
  );
}

function SummaryBody({ summary, phase }: { summary: AiSummary; phase: RevealPhase }) {
  switch (summary.status) {
    case 'ready':
      return <ReadyLines lines={summary.lines} phase={phase} />;
    case 'pending':
      return (
        <>
          <span className="sr-only">{AI_SUMMARY_NOTICE.pending}</span>
          <PendingBars />
        </>
      );
    case 'failed':
      return (
        <span className="block font-mono text-label-sm leading-[22px] tracking-normal text-text-muted">{AI_SUMMARY_NOTICE.failed}</span>
      );
  }
}

/** 붙잡는 동안에도 화면 낭독기에는 요약을 그대로 읽힌다. 막대는 보이기만 하는 연출이다. */
function ReadyLines({ lines, phase }: { lines: string[]; phase: RevealPhase }) {
  switch (phase) {
    case 'holding':
      return (
        <>
          <span className="sr-only">
            <Lines lines={lines} revealing={false} />
          </span>
          <PendingBars />
        </>
      );
    case 'revealing':
      return (
        <>
          <Lines lines={lines} revealing />
          <span className="pointer-events-none absolute inset-x-0 top-0 animate-fade-out motion-reduce:hidden">
            <PendingBars />
          </span>
        </>
      );
    case 'shown':
      return <Lines lines={lines} revealing={false} />;
  }
}

/** 요약 줄이 들어올 자리를 막대로 보여 준다. 줄 수를 모르므로 번호 칸부터 채운다. */
function PendingBars() {
  return (
    <span aria-hidden="true" className="flex flex-col gap-1">
      <span className="flex h-[22px] items-center">
        <span className="shimmer-bar h-2 w-[92%] rounded-[3px]" />
      </span>
      <span className="flex h-[22px] items-center">
        <span className="shimmer-bar h-2 w-[64%] rounded-[3px]" />
      </span>
    </span>
  );
}

/**
 * 번호는 상세 요약과 같이 두 줄 이상일 때만 붙인다.
 * 드러날 때는 줄마다 조금씩 늦게 왼쪽부터 쓰인다. 막대 두 줄보다 많은 줄은 높이를 펼쳐 아래 항목이 튀지 않게 한다.
 */
function Lines({ lines, revealing }: { lines: string[]; revealing: boolean }) {
  const numbered = lines.length > 1;

  return (
    <span className="flex flex-col gap-1">
      {lines.map((line, index) => {
        const opens = revealing && index >= 2;

        return (
          <span
            key={index}
            className={`${numbered ? 'grid grid-cols-[24px_minmax(0,1fr)] grid-rows-[1fr] items-start margin-label:grid-cols-[28px_minmax(0,1fr)]' : 'block'} ${opens ? 'animate-row-open overflow-hidden motion-reduce:animate-none' : ''}`}
            style={opens ? delayMs(index * LINE_STAGGER_MS) : undefined}
          >
            {numbered && (
              <span
                aria-hidden="true"
                className={`min-h-0 font-mono text-label-sm leading-[22px] tracking-normal tabular-nums text-text-muted/70 ${revealing ? 'animate-fade-in motion-reduce:animate-none' : ''}`}
                style={revealing ? delayMs(index * LINE_STAGGER_MS) : undefined}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
            )}
            <span
              className={`block min-h-0 text-body-sm text-text-secondary ${revealing ? 'reveal-sweep' : ''}`}
              style={revealing ? delayMs(index * LINE_STAGGER_MS + 60) : undefined}
            >
              {line}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function SeriesMeta({ series }: { series: PostSeries }) {
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="sr-only">Series</span>
      <span title={series.name} className="min-w-0 truncate">
        {series.name}
      </span>
      <span className="shrink-0">
        {series.position} / {series.total}
      </span>
    </span>
  );
}

function ProjectMeta({ project, series }: { project: Project; series: PostSeries | null }) {
  return (
    <span className="flex min-w-0 items-center">
      <span className="sr-only">Project</span>
      <ProjectTag project={project} className="text-text-secondary" />
      {series && (
        <>
          <span aria-hidden="true" className="mx-2">
            ·
          </span>
          <SeriesMeta series={series} />
        </>
      )}
    </span>
  );
}

function postMeta(post: PostSummary, isSearching: boolean) {
  if (isSearching) return post.similarity != null && `${post.similarity}% match`;

  const project = post.project ? findProject(post.project) : undefined;
  if (!project) return post.series && <SeriesMeta series={post.series} />;

  return <ProjectMeta project={project} series={post.series ?? null} />;
}

const TAB =
  'group relative inline-flex h-9 items-center px-3 pt-1 font-mono text-label-sm tracking-normal text-text-muted transition-colors duration-150 ' +
  'hover:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent motion-reduce:transition-none';

const PRESSED_WELL =
  "before:absolute before:inset-x-[3px] before:top-1.5 before:bottom-0 before:rounded-t-[7px] before:bg-text-primary/5 before:opacity-0 before:content-[''] " +
  'before:shadow-[inset_0_2px_4px_rgb(16_19_25/0.16),inset_1px_0_0_rgb(16_19_25/0.07),inset_-1px_0_0_rgb(16_19_25/0.07)] ' +
  'before:transition-opacity before:duration-150 aria-pressed:text-text-primary aria-pressed:before:opacity-100 motion-reduce:before:transition-none';

const PRESSABLE_LABEL =
  'relative inline-flex items-center gap-1.5 transition-transform duration-150 group-active:translate-y-px group-aria-pressed:translate-y-px motion-reduce:transition-none';

const RULED_ROWS =
  'bg-[repeating-linear-gradient(to_bottom,transparent_0_35px,color-mix(in_srgb,var(--color-outline-variant)_25%,transparent)_35px_36px)]';

const SEARCH_MODE_LABEL = { smart: 'Smart search', basic: 'Basic search' };

function SearchIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true" className={className}>
      <circle cx="7" cy="7" r="4.8" />
      <path d="M10.5 10.5 14 14" strokeLinecap="round" />
    </svg>
  );
}

function ProjectTabs({
  selected,
  onSelect,
  onOpenSearch,
  searchButtonRef,
}: {
  selected: string | null;
  onSelect: (project: string | null) => void;
  onOpenSearch: () => void;
  searchButtonRef: Ref<HTMLButtonElement>;
}) {
  return (
    <div role="group" aria-label="Filter by project" className={`flex flex-wrap ${RULED_ROWS}`}>
      <button type="button" aria-pressed={selected === null} onClick={() => onSelect(null)} className={`${TAB} ${PRESSED_WELL}`}>
        <span className={PRESSABLE_LABEL}>All</span>
      </button>
      {PROJECTS.map((project) => (
        <button
          key={project.slug}
          type="button"
          aria-pressed={selected === project.slug}
          onClick={() => onSelect(project.slug)}
          className={`${TAB} ${PRESSED_WELL}`}
        >
          <span className={PRESSABLE_LABEL}>
            <ProjectTag project={project} />
          </span>
        </button>
      ))}
      <button ref={searchButtonRef} type="button" onClick={onOpenSearch} className={`${TAB} ml-auto hover:text-accent-strong`}>
        <span className={PRESSABLE_LABEL}>
          <SearchIcon className="size-[13px] shrink-0" />
          Search
        </span>
      </button>
    </div>
  );
}

function SearchStatus({ query, mode, className }: { query: string; mode: PostsSearchMode; className: string }) {
  return (
    <span
      role="status"
      className={`min-w-0 items-center gap-2 whitespace-nowrap font-mono text-label-sm tracking-normal text-text-muted ${className}`}
    >
      {query ? (
        <>
          <span className="flex min-w-0">
            Results for “<span className="truncate text-text-primary">{query}</span>”
          </span>
          {mode && <span>· {SEARCH_MODE_LABEL[mode]}</span>}
        </>
      ) : (
        <>
          <span>Press Enter to search</span>
          <span className="hidden @min-[560px]:inline">· Esc to close</span>
        </>
      )}
    </span>
  );
}

function ArchiveHead({ search, filter, isSearching }: { search: PostsSearch; filter: PostsFilter; isSearching: boolean }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const showsSearch = searchOpen || isSearching;
  const query = isSearching ? search.normalizedQuery : '';

  function openSearch() {
    flushSync(() => setSearchOpen(true));
    inputRef.current?.focus();
  }

  function closeSearch() {
    flushSync(() => {
      setSearchOpen(false);
      search.onClose();
    });
    searchButtonRef.current?.focus();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    search.onQuerySubmit();
  }

  return (
    <div className="@container relative mt-6 grid">
      <div className={`col-start-1 row-start-1 min-w-0 ${showsSearch ? 'invisible' : ''}`}>
        <ProjectTabs
          selected={filter.project}
          onSelect={filter.onProjectChange}
          onOpenSearch={openSearch}
          searchButtonRef={searchButtonRef}
        />
      </div>
      <div className={`col-start-1 row-start-1 min-w-0 ${showsSearch ? '' : 'invisible'}`}>
        <form role="search" onSubmit={handleSubmit} className="flex h-9 items-center gap-2.5 px-3">
          <SearchIcon className="size-3.5 shrink-0 text-text-muted" />
          <label htmlFor="posts-archive-search" className="sr-only">
            Search posts by title or content
          </label>
          <input
            ref={inputRef}
            id="posts-archive-search"
            type="search"
            placeholder="Search title or content"
            value={search.query}
            onChange={(e) => search.onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeSearch();
            }}
            className="min-w-24 flex-1 border-0 bg-transparent text-body-md text-text-primary caret-accent outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          <SearchStatus query={query} mode={search.mode} className="hidden @min-[560px]:flex" />
          <button
            type="button"
            aria-label="Close search"
            onClick={closeSearch}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-[15px] text-text-muted hover:bg-text-primary/5 hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            ×
          </button>
        </form>
        <SearchStatus query={query} mode={search.mode} className="flex h-9 px-3 @min-[560px]:hidden" />
      </div>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-[35px] h-px origin-right bg-accent transition-transform duration-300 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none ${showsSearch ? 'scale-x-100' : 'scale-x-0'}`}
      />
    </div>
  );
}

const SWITCHING_PROJECT = 'opacity-35 transition-opacity delay-200 duration-150 motion-reduce:transition-none';
const SETTLED = 'transition-opacity duration-150 motion-reduce:transition-none';

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

export function PostsListSection({ search, filter, state }: { search: PostsSearch; filter: PostsFilter; state: PostsListState }) {
  const isSearching = search.normalizedQuery.length > 0;
  const highlight = isSearching ? search.normalizedQuery : '';

  return (
    <section id="posts" className="px-4 pb-32 pt-16">
      <div className="mx-auto max-w-measure">
        <h1 className="text-headline-md text-text-primary">Posts</h1>

        <ArchiveHead search={search} filter={filter} isSearching={isSearching} />

        <div className="mt-2">
          {state.status === 'loading' ? null : state.status === 'error' ? (
            <ErrorState error={state.error} />
          ) : state.status === 'empty' ? (
            isSearching ? (
              <EmptyState variant="search" query={search.normalizedQuery} className={ARCHIVE_SPACING} />
            ) : (
              <EmptyState variant="list" className={ARCHIVE_SPACING} />
            )
          ) : (
            <div aria-busy={filter.switching} className={filter.switching ? SWITCHING_PROJECT : SETTLED}>
              <ArchiveIndex
                key={filter.listedProject ?? 'all'}
                entries={state.posts.map((post) => ({
                  id: post.postId,
                  href: `/posts/${post.postId}`,
                  title: <Highlighted text={post.title} query={highlight} />,
                  meta: postMeta(post, isSearching),
                  detail: isSearching ? (
                    post.snippet && (
                      <span className="mt-2 line-clamp-2 text-body-md text-text-muted">
                        <Highlighted text={post.snippet} query={highlight} />
                      </span>
                    )
                  ) : (
                    <SummaryLines postId={post.postId} summary={post.summary} />
                  ),
                }))}
              />
              <div ref={state.sentinelRef} className="h-px" aria-hidden="true" />
              {!state.hasNextPage && <EndOfList label="End of posts" className={ARCHIVE_SPACING} />}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
