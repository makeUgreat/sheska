import { type CSSProperties, type FocusEvent, type FormEvent, type Ref, type RefObject, useEffect, useRef, useState } from 'react';
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

const SEARCH_LABEL = 'Search posts by title or content';

const SEARCH_MODE_HINT = { smart: 'smart search', basic: 'basic search' };

const PROMPT_COMMAND = 'grep';
const PROMPT_KEY_DELAY_MS = 70;
const PROMPT_FIRST_KEY_MS = 90;

const INDEX_BUTTON =
  'group inline-flex h-[30px] items-center gap-1.5 rounded-md px-2 font-mono text-label-sm tracking-normal text-text-muted transition-colors duration-150 ' +
  'hover:text-text-secondary aria-pressed:font-semibold aria-pressed:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent motion-reduce:transition-none';

const ALL_MARK_DIM =
  'opacity-45 grayscale transition-[opacity,filter] duration-250 group-hover:opacity-80 group-aria-pressed:opacity-100 group-aria-pressed:grayscale-0 motion-reduce:transition-none';

const PROJECT_LOGO_DIM =
  '[&_img]:opacity-45 [&_img]:grayscale [&_img]:transition-[opacity,filter] [&_img]:duration-250 group-hover:[&_img]:opacity-80 ' +
  'group-aria-pressed:[&_img]:opacity-100 group-aria-pressed:[&_img]:grayscale-0 motion-reduce:[&_img]:transition-none';

function SearchIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true" className={className}>
      <circle cx="7" cy="7" r="4.8" />
      <path d="M10.5 10.5 14 14" strokeLinecap="round" />
    </svg>
  );
}

function AllProjectsMark() {
  return (
    <svg
      viewBox="0 0 14 14"
      aria-hidden="true"
      className={`size-3.5 shrink-0 rounded-[3px] bg-accent ${ALL_MARK_DIM} group-aria-pressed:animate-mark-pop motion-reduce:animate-none`}
    >
      <circle cx="4.6" cy="4.6" r="1.6" fill="#fff" />
      <circle cx="9.4" cy="4.6" r="1.6" fill="#fff" opacity=".7" />
      <circle cx="4.6" cy="9.4" r="1.6" fill="#fff" opacity=".7" />
      <circle cx="9.4" cy="9.4" r="1.6" fill="#fff" opacity=".45" />
    </svg>
  );
}

function ProjectIndex({
  selected,
  onSelect,
  receded,
}: {
  selected: string | null;
  onSelect: (project: string | null) => void;
  receded: boolean;
}) {
  return (
    <div
      className={`mt-4 transition-[opacity,filter] duration-250 motion-reduce:transition-none margin-index:absolute margin-index:inset-y-0 margin-index:right-[calc(100%+40px)] margin-index:mt-0 margin-index:w-margin-index ${receded ? 'opacity-35 grayscale' : ''}`}
    >
      <div className="margin-index:sticky margin-index:top-[calc(var(--spacing-header)+48px)] margin-index:grid margin-index:gap-1.5">
        <span
          aria-hidden="true"
          className="hidden font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted margin-index:block"
        >
          Projects
        </span>
        <div role="group" aria-label="Filter by project" className="-ml-2 flex flex-wrap margin-index:grid margin-index:gap-0.5">
          <button type="button" aria-pressed={selected === null} onClick={() => onSelect(null)} className={INDEX_BUTTON}>
            <AllProjectsMark />
            All
          </button>
          {PROJECTS.map((project) => (
            <button
              key={project.slug}
              type="button"
              aria-pressed={selected === project.slug}
              onClick={() => onSelect(project.slug)}
              className={`${INDEX_BUTTON} ${PROJECT_LOGO_DIM}`}
            >
              <ProjectTag project={project} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
function searchHint({ draft, submitted, mode }: { draft: string; submitted: string; mode: PostsSearchMode }) {
  const edited = draft.trim() !== submitted;
  if (edited) return draft.trim() ? '↵ run' : '↵ run · esc quit';
  if (!submitted) return '↵ run · esc quit';
  if (!mode) return '';

  return `→ ${SEARCH_MODE_HINT[mode]}`;
}

function usePromptTyping(active: boolean) {
  const [typedLength, setTypedLength] = useState(0);

  useEffect(() => {
    if (!active) {
      setTypedLength(0);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedLength(PROMPT_COMMAND.length);
      return;
    }

    const timers = Array.from(PROMPT_COMMAND, (_, index) =>
      window.setTimeout(() => setTypedLength((length) => Math.max(length, index + 1)), PROMPT_FIRST_KEY_MS + index * PROMPT_KEY_DELAY_MS),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [active]);

  return { typedCommand: PROMPT_COMMAND.slice(0, typedLength), finishTyping: () => setTypedLength(PROMPT_COMMAND.length) };
}

function SearchPrompt({
  search,
  focused,
  onFocusChange,
  inputRef,
}: {
  search: PostsSearch;
  focused: boolean;
  onFocusChange: (focused: boolean) => void;
  inputRef: RefObject<HTMLInputElement>;
}) {
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const { typedCommand, finishTyping } = usePromptTyping(focused);
  const commandTyped = typedCommand.length === PROMPT_COMMAND.length;
  const isSearching = search.normalizedQuery.length > 0;
  const hint = searchHint({ draft: search.query, submitted: search.normalizedQuery, mode: search.mode });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    search.onQuerySubmit();
  }

  function handleBlur(e: FocusEvent<HTMLFormElement>) {
    if (e.currentTarget.contains(e.relatedTarget)) return;

    onFocusChange(false);
  }

  function close() {
    search.onClose();
    inputRef.current?.blur();
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      onFocus={() => onFocusChange(true)}
      onBlur={handleBlur}
      className="group/search relative min-w-0 sm:flex-[0_1_300px] sm:focus-within:grow"
    >
      <div className="flex h-[34px] items-center gap-2 rounded-[7px] bg-text-primary/4 px-2.5 text-text-muted transition-colors duration-250 group-focus-within/search:gap-0 group-focus-within/search:bg-transparent group-focus-within/search:px-0 motion-reduce:transition-none">
        <SearchIcon className="size-[13px] shrink-0 group-focus-within/search:hidden" />
        <span
          aria-hidden="true"
          className="hidden shrink-0 whitespace-pre font-mono text-[20px] font-medium leading-7 text-accent-strong group-focus-within/search:inline"
        >
          <span className="font-normal text-text-muted">$ </span>
          {typedCommand}
          {commandTyped && ' '}
        </span>
        <label htmlFor="posts-archive-search" className="sr-only">
          {SEARCH_LABEL}
        </label>
        <span className="relative flex min-w-0 flex-1 items-center">
          <input
            ref={inputRef}
            id="posts-archive-search"
            type="search"
            placeholder="Search posts"
            autoComplete="off"
            value={search.query}
            onChange={(e) => {
              finishTyping();
              search.onQueryChange(e.target.value);
            }}
            onSelect={(e) => setCaretAtEnd(e.currentTarget.selectionStart === e.currentTarget.value.length)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
            }}
            className={`w-full min-w-0 border-0 bg-transparent text-body-sm text-text-primary caret-accent outline-none placeholder:text-text-muted group-focus-within/search:font-mono group-focus-within/search:text-[20px] group-focus-within/search:font-medium group-focus-within/search:leading-7 group-focus-within/search:placeholder:text-transparent [&::-webkit-search-cancel-button]:hidden ${caretAtEnd ? 'group-focus-within/search:caret-transparent' : ''}`}
          />
          {focused && caretAtEnd && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center overflow-hidden">
              <span className="invisible whitespace-pre font-mono text-[20px] font-medium leading-7">{search.query}</span>
              <span className="ml-px h-[21px] w-[11px] shrink-0 animate-pulse bg-accent motion-reduce:animate-none" />
            </span>
          )}
        </span>
        {isSearching ? (
          <button
            type="button"
            aria-label="Close search"
            onClick={close}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-[15px] text-text-muted hover:bg-text-primary/5 hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            ×
          </button>
        ) : (
          <kbd className="hidden h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded border border-text-primary/12 px-1 font-mono text-[11px] leading-none text-text-muted sm:inline-flex">
            {focused ? 'esc' : '/'}
          </kbd>
        )}
      </div>
      {(focused || isSearching) && (
        <p
          role="status"
          className="sr-only font-mono text-label-sm tracking-normal text-text-muted sm:not-sr-only sm:absolute sm:left-0 sm:top-full sm:mt-1.5 sm:whitespace-nowrap"
        >
          {hint}
        </p>
      )}
    </form>
  );
}

function useSlashToSearch(inputRef: RefObject<HTMLInputElement>) {
  useEffect(() => {
    function focusSearch(e: KeyboardEvent) {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable="true"]') !== null;
      const pressedSlash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey;
      if (pressedSlash && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener('keydown', focusSearch);
    return () => document.removeEventListener('keydown', focusSearch);
  }, [inputRef]);
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
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useSlashToSearch(inputRef);
  const isSearching = search.normalizedQuery.length > 0;
  const highlight = isSearching ? search.normalizedQuery : '';
  const awaitingRun = searchFocused && (!isSearching || search.query.trim() !== search.normalizedQuery);

  function selectProject(project: string | null) {
    if (isSearching) search.onClose();
    filter.onProjectChange(project);
  }

  return (
    <section id="posts" className="px-4 pb-32 pt-16">
      <div className="relative mx-auto max-w-measure">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <h1 className="shrink-0 text-headline-md text-text-primary">Posts</h1>
          <SearchPrompt search={search} focused={searchFocused} onFocusChange={setSearchFocused} inputRef={inputRef} />
        </div>

        <ProjectIndex selected={filter.project} onSelect={selectProject} receded={searchFocused} />

        <div className={`mt-6 transition-opacity duration-300 motion-reduce:transition-none ${awaitingRun ? 'opacity-25' : ''}`}>
          {state.status === 'loading' ? null : state.status === 'error' ? (
            <ErrorState error={state.error} />
          ) : state.status === 'empty' ? (
            isSearching ? (
              <EmptyState variant="search" query={search.normalizedQuery} />
            ) : (
              <EmptyState variant="list" />
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
