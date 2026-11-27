import { type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { AI_SUMMARY_NOTICE, type AiSummary, type GetPostResponse } from '@/entities/post';
import { formatDottedDate, type RevealPhase, useStagedReveal } from '@/shared/lib';
import { AiMark, ArticleLayout, EmptyState, ErrorState } from '@/shared/ui';
import { SeriesContents, SeriesLine } from './post-series';

export type PostArticleState =
  { status: 'loading' } | { status: 'error'; error: Error } | { status: 'empty' } | { status: 'success'; post: GetPostResponse };

/** `canOpenViews`면 조회수가 조회내역으로 가는 링크가 된다. 소유자만 조회내역을 읽을 수 있다. */
export function PostArticleSection({ state, canOpenViews = false }: { state: PostArticleState; canOpenViews?: boolean }) {
  if (state.status === 'loading') {
    return (
      <div className="pt-10">
        <PendingBack />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="pt-10">
        <PendingBack />
        <ErrorState error={state.error} />
      </div>
    );
  }

  if (state.status === 'empty') {
    return (
      <div className="pt-10">
        <PendingBack />
        <EmptyState variant="document" className="py-24" />
      </div>
    );
  }

  const { post } = state;

  return (
    <ArticleLayout
      header={<PostHeader post={post} canOpenViews={canOpenViews} />}
      body={post.body}
      footer={post.series && <SeriesContents series={post.series} postId={post.postId} />}
    />
  );
}

/** 좁은 화면에서는 메타 줄과 같은 글자 링크이고, 넓은 화면에서는 32px 칸 안의 아이콘이다. */
function BackToPosts({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/posts"
      aria-label="Back to posts"
      title="목록으로"
      className={`flex h-6 w-fit shrink-0 items-center gap-1 rounded-sm font-mono text-label-sm uppercase text-text-muted transition-colors hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent margin-label:size-8 margin-label:justify-center margin-label:rounded-md ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-3.5 margin-label:size-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5" />
        <path d="M11 6l-6 6 6 6" />
      </svg>
      <span className="margin-label:sr-only">Posts</span>
    </Link>
  );
}

/** 글을 아직 못 그린 동안에는 제목이 없으므로 돌아가는 아이콘을 맨 위 왼쪽에 둔다. */
function PendingBack() {
  return (
    <div className="mb-5">
      <BackToPosts className="margin-label:-ml-2.5" />
    </div>
  );
}

/**
 * 좁은 화면에서는 제목 위 왼쪽에 선다. 넓은 화면에서는 본문 heading의 `##`처럼 제목 첫 줄 왼쪽 여백에 건다.
 * 그림의 오른쪽 끝과 제목 사이를 `##`과 같은 gutter로 둔다. 제목 첫 줄 높이 38.4px의 가운데에 맞춘다.
 * 시리즈 줄이 있으면 그 높이 28px과 아래 여백 8px만큼 내려간다.
 */
const BACK_BESIDE_TITLE = 'mb-2 margin-label:absolute margin-label:right-[calc(100%+var(--spacing-gutter)-7px)] margin-label:m-0';

function PostHeader({ post, canOpenViews }: { post: GetPostResponse; canOpenViews: boolean }) {
  return (
    <>
      <div className="relative">
        <BackToPosts className={`${BACK_BESIDE_TITLE} ${post.series ? 'margin-label:top-[39px]' : 'margin-label:top-[3px]'}`} />
        {post.series && <SeriesLine series={post.series} />}
        <h1 className="break-words font-sans text-headline-md text-text-primary">{post.title}</h1>
      </div>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-label-sm uppercase text-text-muted">
        <span>
          Updated{' '}
          <time dateTime={post.updatedAt} className="tabular-nums text-text-secondary">
            {formatDottedDate(post.updatedAt)}
          </time>
        </span>
        <span>
          Created{' '}
          <time dateTime={post.createdAt} className="tabular-nums text-text-secondary">
            {formatDottedDate(post.createdAt)}
          </time>
        </span>
        {canOpenViews ? (
          <ViewsLink postId={post.postId} viewCount={post.viewCount} />
        ) : (
          <span>
            <span className="tabular-nums text-text-secondary">{post.viewCount}</span> views
          </span>
        )}
      </p>
      <Summary key={post.postId} postId={post.postId} summary={post.summary} />
    </>
  );
}

/** 눌러야 갈 수 있다는 표시는 hover 때만 드러낸다. 평소에는 방문자에게 보이는 줄과 같다. */
function ViewsLink({ postId, viewCount }: { postId: string; viewCount: number }) {
  return (
    <Link
      to={`/posts/${postId}/views`}
      aria-label={`${viewCount} views, open view history`}
      className="group/views inline-flex items-center gap-1 rounded-sm transition-colors duration-150 hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:transition-none"
    >
      <span className="tabular-nums text-text-secondary transition-colors duration-150 group-hover/views:text-accent-strong motion-reduce:transition-none">
        {viewCount}
      </span>{' '}
      views
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-3 -translate-x-1 opacity-0 transition duration-200 group-hover/views:translate-x-0 group-hover/views:opacity-100 motion-reduce:transition-none"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
        <path d="M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

const SUMMARY_HOLD_MS = 700;
const LINE_STAGGER_MS = 140;

function delayMs(ms: number): CSSProperties {
  return { animationDelay: `${ms}ms` };
}

/**
 * 요약이 없을 때도 자리를 남긴다. 화면 맨 위 모양이 글마다 달라지지 않는다.
 * 줄 앞 32px 칸은 번호 자리다. 줄 수가 바뀌어도 글자의 왼쪽 끝이 같은 자리에 선다.
 * 이미 만든 요약도 처음 볼 때는 작성 중처럼 잠깐 막대를 보인 뒤 드러낸다.
 */
function Summary({ postId, summary }: { postId: string; summary: AiSummary }) {
  const { ref, phase } = useStagedReveal(postId, { ready: summary.status === 'ready', holdMs: SUMMARY_HOLD_MS });
  const shown = summary.status === 'ready' && phase !== 'holding';
  const writing = summary.status === 'pending' || (summary.status === 'ready' && phase === 'holding');
  const pop = phase === 'revealing' ? 'animate-mark-pop motion-reduce:animate-none' : '';

  return (
    <section ref={ref} aria-label="AI summary" className="mt-5">
      <p className={`flex items-center gap-1.5 font-mono text-label-sm uppercase ${shown ? 'text-accent-strong' : 'text-text-muted'}`}>
        <AiMark twinkling={writing} className={shown ? `text-accent ${pop}` : 'opacity-60'} />
        AI summary
      </p>
      <div className="mt-1.5 pl-[22px]">
        <div className="relative">
          <SummaryBody summary={summary} phase={phase} />
        </div>
      </div>
    </section>
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
      return <p className="pl-8 text-body-sm leading-[26px] text-text-muted">{AI_SUMMARY_NOTICE.failed}</p>;
  }
}

/** 붙잡는 동안에도 화면 낭독기에는 요약을 그대로 읽힌다. 막대는 보이기만 하는 연출이다. */
function ReadyLines({ lines, phase }: { lines: string[]; phase: RevealPhase }) {
  switch (phase) {
    case 'holding':
      return (
        <>
          <div className="sr-only">
            <SummaryLines lines={lines} revealing={false} />
          </div>
          <PendingBars />
        </>
      );
    case 'revealing':
      return (
        <>
          <SummaryLines lines={lines} revealing />
          <div className="pointer-events-none absolute inset-x-0 top-0 animate-fade-out motion-reduce:hidden">
            <PendingBars />
          </div>
        </>
      );
    case 'shown':
      return <SummaryLines lines={lines} revealing={false} />;
  }
}

/** 요약 줄이 들어올 자리를 막대로 보여 준다. 번호 칸부터 채운다. */
function PendingBars() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-0.5">
      <span className="flex h-[26px] items-center">
        <span className="shimmer-bar h-2.5 w-[92%] rounded-[3px]" />
      </span>
      <span className="flex h-[26px] items-center">
        <span className="shimmer-bar h-2.5 w-[64%] rounded-[3px]" />
      </span>
    </div>
  );
}

/**
 * 번호는 순서가 있을 때만 뜻이 있다. 한 줄뿐이면 `01` 하나가 다음 줄이 빠진 것처럼 보여서 붙이지 않는다.
 * 드러날 때는 줄마다 조금씩 늦게 왼쪽부터 쓰인다. 막대 두 줄보다 많은 줄은 높이를 펼쳐 머리판 경계가 튀지 않게 한다.
 */
function SummaryLines({ lines, revealing }: { lines: string[]; revealing: boolean }) {
  const numbered = lines.length > 1;

  return (
    <ol className="flex flex-col gap-0.5">
      {lines.map((line, index) => {
        const opens = revealing && index >= 2;

        return (
          <li
            key={index}
            className={`grid grid-cols-[32px_minmax(0,1fr)] grid-rows-[1fr] items-baseline ${opens ? 'animate-row-open overflow-hidden motion-reduce:animate-none' : ''}`}
            style={opens ? delayMs(index * LINE_STAGGER_MS) : undefined}
          >
            <span
              aria-hidden="true"
              className={`min-h-0 font-mono text-label-sm leading-[26px] tracking-normal tabular-nums text-text-muted/70 ${revealing ? 'animate-fade-in motion-reduce:animate-none' : ''}`}
              style={revealing ? delayMs(index * LINE_STAGGER_MS) : undefined}
            >
              {numbered ? String(index + 1).padStart(2, '0') : ''}
            </span>
            <p
              className={`min-h-0 text-body-md leading-[26px] text-text-secondary ${revealing ? 'reveal-sweep' : ''}`}
              style={revealing ? delayMs(index * LINE_STAGGER_MS + 60) : undefined}
            >
              {line}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
