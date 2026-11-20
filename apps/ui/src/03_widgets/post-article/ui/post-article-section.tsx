import { type ReactNode } from 'react';
import { AI_SUMMARY_NOTICE, type AiSummary, type GetPostResponse } from '@/entities/post';
import { formatDate, type Heading } from '@/shared/lib';
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

/** `ask`는 요약 콜아웃 바로 아래, 본문 구분선 위에 놓인다. */
export function PostArticleSection({ state, ask }: { state: PostArticleState; ask?: ReactNode }) {
  if (state.status === 'loading') {
    return <LoadingState className="py-24" />;
  }

  if (state.status === 'error') {
    return <ErrorState error={state.error} />;
  }

  if (state.status === 'empty') {
    return <EmptyState variant="document" className="py-24" />;
  }

  const { post, outline, activeHeadingId } = state;

  return (
    <ArticleLayout header={<PostHeader post={post} ask={ask} />} body={post.body} outline={outline} activeHeadingId={activeHeadingId} />
  );
}

function PostHeader({ post, ask }: { post: GetPostResponse; ask: ReactNode }) {
  return (
    <>
      <h1 className="break-words font-sans text-headline-md text-text-primary">{post.title}</h1>
      <p className="mt-2 flex flex-wrap gap-x-2 text-body-md text-text-muted">
        <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
        <span aria-hidden="true">·</span>
        <span>{post.viewCount} views</span>
      </p>
      <SummaryCallout summary={post.summary} />
      {ask}
    </>
  );
}

/**
 * 요약이 없을 때도 콜아웃을 남기고 안의 줄만 바꾼다. 화면 맨 위 모양이 글마다 달라지지 않는다.
 * 제목 줄의 아이콘 16px과 간격 4px이 20px을 이뤄, 아래 줄을 목록 행의 요약과 같은 선에 세운다.
 */
function SummaryCallout({ summary }: { summary: AiSummary }) {
  const ready = summary.status === 'ready';

  return (
    <section aria-label="AI summary" className="mt-5 rounded-lg bg-accent-tint px-4 pt-3.5 pb-4">
      <p className={`flex items-center gap-1 font-mono text-label-sm uppercase ${ready ? 'text-accent-strong' : 'text-text-muted'}`}>
        <AiMark className={`-ml-0.5 mr-0.5 ${ready ? 'text-accent' : 'opacity-60'}`} />
        AI summary
      </p>
      <div className="mt-1.5 pl-5">
        {summary.status === 'ready' ? (
          summary.lines.map((line, index) => (
            <p key={index} className="text-body-md leading-[26px] text-text-secondary">
              {line}
            </p>
          ))
        ) : (
          <p className="font-mono text-label-sm leading-[26px] tracking-normal text-text-muted">{AI_SUMMARY_NOTICE[summary.status]}</p>
        )}
      </div>
    </section>
  );
}
