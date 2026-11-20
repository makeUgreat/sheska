import { Link } from 'react-router-dom';
import { AI_SUMMARY_NOTICE, type AiSummary, type GetPostResponse } from '@/entities/post';
import { formatDottedDate, type Heading } from '@/shared/lib';
import { AiMark, ArticleLayout, EmptyState, ErrorState, LoadingState } from '@/shared/ui';

export type PostArticleState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'empty' }
  | {
      status: 'success';
      post: GetPostResponse;
      outline: Heading[];
      activeHeadingId: string | null;
    };

const FOCUS_RING = 'rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';

export function PostArticleSection({ state }: { state: PostArticleState }) {
  if (state.status === 'loading') {
    return (
      <div className="pt-10">
        <PostCrumb />
        <LoadingState className="py-24" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="pt-10">
        <PostCrumb />
        <ErrorState error={state.error} />
      </div>
    );
  }

  if (state.status === 'empty') {
    return (
      <div className="pt-10">
        <PostCrumb />
        <EmptyState variant="document" className="py-24" />
      </div>
    );
  }

  const { post, outline, activeHeadingId } = state;

  return <ArticleLayout header={<PostHeader post={post} />} body={post.body} outline={outline} activeHeadingId={activeHeadingId} />;
}

/** 글 제목을 함께 적어 지금 어느 글에 있는지 보인다. 긴 제목은 한 줄에서 자르고 전문은 `title`에 남긴다. */
function PostCrumb({ title }: { title?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex min-w-0 items-center gap-2 font-mono text-label-sm tracking-normal text-text-muted">
      <Link
        to="/posts"
        aria-label="Back to posts"
        className={`inline-flex shrink-0 items-center gap-1.5 transition-colors hover:text-accent-strong ${FOCUS_RING}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="M11 6l-6 6 6 6" />
        </svg>
        posts
      </Link>
      {title && (
        <>
          <span aria-hidden="true">/</span>
          <span title={title} className="min-w-0 truncate text-text-secondary">
            {title}
          </span>
        </>
      )}
    </nav>
  );
}

function PostHeader({ post }: { post: GetPostResponse }) {
  return (
    <>
      <PostCrumb title={post.title} />
      <h1 className="break-words font-sans text-headline-md text-text-primary">{post.title}</h1>
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
