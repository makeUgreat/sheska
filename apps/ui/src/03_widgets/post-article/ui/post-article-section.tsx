import { Link } from 'react-router-dom';
import { AI_SUMMARY_NOTICE, type AiSummary, type GetPostResponse } from '@/entities/post';
import { formatDottedDate } from '@/shared/lib';
import { AiMark, ArticleLayout, EmptyState, ErrorState, LoadingState } from '@/shared/ui';

export type PostArticleState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'empty' }
  | { status: 'success'; post: GetPostResponse };

export function PostArticleSection({ state }: { state: PostArticleState }) {
  if (state.status === 'loading') {
    return (
      <div className="pt-10">
        <PendingBack />
        <LoadingState className="py-24" />
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

  return <ArticleLayout header={<PostHeader post={post} />} body={post.body} />;
}

/** 목록으로 돌아가는 아이콘이다. 칸 32px 안에 그림 18px을 가운데 두므로 그림 양옆에 7px씩 빈 칸이 있다. */
function BackLink({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/posts"
      aria-label="Back to posts"
      title="목록으로"
      className={`flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5" />
        <path d="M11 6l-6 6 6 6" />
      </svg>
    </Link>
  );
}

/** 글을 아직 못 그린 동안에는 제목이 없으므로 돌아가는 아이콘을 맨 위 왼쪽에 둔다. */
function PendingBack() {
  return (
    <div className="mb-5">
      <BackLink className="-ml-2.5" />
    </div>
  );
}

/**
 * 좁은 화면에서는 제목 위 왼쪽에 선다. 넓은 화면에서는 본문 heading의 `##`처럼 제목 첫 줄 왼쪽 여백에 건다.
 * 그림의 오른쪽 끝과 제목 사이를 `##`과 같은 gutter로 둔다. 제목 첫 줄 높이 38.4px의 가운데에 맞춘다.
 */
const BACK_BESIDE_TITLE =
  'mb-3.5 -ml-2.5 margin-label:absolute margin-label:top-[3px] margin-label:right-[calc(100%+var(--spacing-gutter)-7px)] margin-label:m-0';

function PostHeader({ post }: { post: GetPostResponse }) {
  return (
    <>
      <div className="relative">
        <BackLink className={BACK_BESIDE_TITLE} />
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
        <span>
          <span className="tabular-nums text-text-secondary">{post.viewCount}</span> views
        </span>
      </p>
      <Summary summary={post.summary} />
    </>
  );
}

/**
 * 요약이 없을 때도 자리를 남기고 문구만 바꾼다. 화면 맨 위 모양이 글마다 달라지지 않는다.
 * 줄 앞 32px 칸은 번호 자리다. 줄 수가 바뀌어도 글자의 왼쪽 끝이 같은 자리에 선다.
 */
function Summary({ summary }: { summary: AiSummary }) {
  const ready = summary.status === 'ready';

  return (
    <section aria-label="AI summary" className="mt-7">
      <p className={`flex items-center gap-1.5 font-mono text-label-sm uppercase ${ready ? 'text-accent-strong' : 'text-text-muted'}`}>
        <AiMark className={ready ? 'text-accent' : 'opacity-60'} />
        AI summary
      </p>
      {summary.status === 'ready' ? (
        <SummaryLines lines={summary.lines} />
      ) : (
        <p className="mt-1.5 pl-8 font-mono text-label-sm leading-[28px] tracking-normal text-text-muted">
          {AI_SUMMARY_NOTICE[summary.status]}
        </p>
      )}
    </section>
  );
}

/** 번호는 순서가 있을 때만 뜻이 있다. 한 줄뿐이면 `01` 하나가 다음 줄이 빠진 것처럼 보여서 붙이지 않는다. */
function SummaryLines({ lines }: { lines: string[] }) {
  const numbered = lines.length > 1;

  return (
    <ol className="mt-1.5">
      {lines.map((line, index) => (
        <li key={index} className="grid grid-cols-[32px_minmax(0,1fr)] items-start">
          <span aria-hidden="true" className="font-mono text-label-sm leading-[28px] tracking-normal tabular-nums text-accent-strong">
            {numbered ? String(index + 1).padStart(2, '0') : ''}
          </span>
          <p className="text-body-md leading-[28px] text-text-secondary">{line}</p>
        </li>
      ))}
    </ol>
  );
}
