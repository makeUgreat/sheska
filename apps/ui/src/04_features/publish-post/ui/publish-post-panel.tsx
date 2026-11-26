import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { type AiSummary, usePost, usePublishPost, useUnpublishPost } from '@/entities/post';
import { formatDottedDate, formatTime } from '@/shared/lib';
import { CopyButton } from '@/shared/ui';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';
const BUTTON = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-4 text-body-sm font-medium transition-colors disabled:cursor-not-allowed disabled:bg-plate-line disabled:text-text-muted ${FOCUS_RING}`;
const PUBLISH_BUTTON = `${BUTTON} bg-accent-strong text-white hover:bg-accent-deep`;
const CONFIRM_BUTTON = `${BUTTON} bg-text-primary text-white hover:bg-surface-container-high`;
const OUTLINE_BUTTON = `${BUTTON} border border-outline-variant/25 bg-page-background text-text-primary hover:border-text-primary disabled:border-transparent`;
const DESCRIPTION = 'mt-1.5 text-body-sm text-text-secondary';

const SUMMARY_LABEL: Record<AiSummary['status'], string> = {
  pending: 'AI 요약 만드는 중',
  ready: 'AI 요약 완료',
  failed: 'AI 요약 실패',
};

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function PublishGlyph() {
  return (
    <Glyph>
      <path d="M8 11V3" />
      <path d="M4.5 6.5 8 3l3.5 3.5" />
      <path d="M3 13h10" />
    </Glyph>
  );
}

function HideGlyph() {
  return (
    <Glyph>
      <path d="M2 8s2.2-4.5 6-4.5c1.1 0 2.1.4 2.9.9M14 8s-2.2 4.5-6 4.5c-1.1 0-2.1-.4-2.9-.9" />
      <path d="M6.6 9.4a2 2 0 0 1 2.8-2.8" />
      <path d="M2.5 13.5 13.5 2.5" />
    </Glyph>
  );
}

function OpenGlyph() {
  return (
    <Glyph>
      <path d="M6 3h7v7" />
      <path d="M13 3 4 12" />
    </Glyph>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
    />
  );
}

function State({ glyph, children }: { glyph: string; children: ReactNode }) {
  return (
    <p className="text-body-sm font-medium text-text-primary">
      <span aria-hidden="true" className="mr-1.5 font-mono">
        {glyph}
      </span>
      {children}
    </p>
  );
}

function PublishedDetails({ postId }: { postId: string }) {
  const { data: post } = usePost(postId);
  const path = `/posts/${postId}`;

  return (
    <>
      <State glyph="●">게시됨</State>
      <div className="mt-2.5 flex min-w-0 items-center gap-2">
        <code title={path} className="min-w-0 flex-1 truncate font-mono text-label-sm tracking-normal text-text-secondary">
          {path}
        </code>
        <CopyButton value={`${window.location.origin}${path}`} label="포스트 주소 복사" />
      </div>
      {post && (
        <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-label-sm tracking-normal tabular-nums">
          <dt className="text-text-muted">조회</dt>
          <dd className="text-right text-text-secondary">{post.viewCount}회</dd>
          <dt className="text-text-muted">게시</dt>
          <dd className="text-right text-text-secondary">
            {formatDottedDate(post.createdAt)} {formatTime(post.createdAt)}
          </dd>
          <dt className="text-text-muted">요약</dt>
          <dd className="text-right text-text-secondary">{SUMMARY_LABEL[post.summary.status]}</dd>
        </dl>
      )}
    </>
  );
}

export function PublishPostPanel({
  sourceId,
  publishedPostId,
  syncCompleted,
}: {
  sourceId: string;
  publishedPostId: string | null;
  syncCompleted: boolean;
}) {
  const publishPost = usePublishPost();
  const unpublishPost = useUnpublishPost();
  const [confirming, setConfirming] = useState(false);
  const postId = unpublishPost.isSuccess ? null : (publishPost.data?.postId ?? publishedPostId);

  function publish() {
    unpublishPost.reset();
    publishPost.mutate({ sourceId });
  }

  function unpublish(id: string) {
    unpublishPost.mutate(id, {
      onSuccess: () => {
        publishPost.reset();
        setConfirming(false);
      },
    });
  }

  function stopConfirming() {
    unpublishPost.reset();
    setConfirming(false);
  }

  return (
    <section aria-labelledby="publish-post-heading">
      <h2 id="publish-post-heading" className="mb-3 font-mono text-label-sm uppercase text-text-muted">
        게시
      </h2>

      {postId ? (
        <>
          <PublishedDetails postId={postId} />
          {confirming ? (
            <div role="alertdialog" aria-labelledby="unpublish-question" className="mt-3.5 border-t border-text-primary pt-3.5">
              {unpublishPost.isError ? (
                <>
                  <p id="unpublish-question" role="alert" className="text-body-sm font-semibold text-text-primary">
                    <span aria-hidden="true" className="font-mono">
                      ✕{' '}
                    </span>
                    게시를 취소하지 못했습니다.
                  </p>
                  <p className={DESCRIPTION}>{unpublishPost.error.message}</p>
                </>
              ) : (
                <>
                  <p id="unpublish-question" className="text-body-sm font-semibold text-text-primary">
                    게시를 취소할까요?
                  </p>
                  <p className={DESCRIPTION}>
                    조회수와 방문 기록, AI 요약이 함께 지워집니다. 되돌릴 수 없습니다. source와 원문은 남습니다.
                  </p>
                </>
              )}
              <div className="mt-3.5 grid gap-2">
                <button type="button" onClick={() => unpublish(postId)} disabled={unpublishPost.isPending} className={CONFIRM_BUTTON}>
                  {unpublishPost.isPending ? <Spinner /> : <HideGlyph />}
                  {unpublishPost.isPending ? '취소하는 중...' : unpublishPost.isError ? '다시 시도' : '게시 취소하기'}
                </button>
                <button type="button" onClick={stopConfirming} disabled={unpublishPost.isPending} className={OUTLINE_BUTTON}>
                  그만두기
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3.5 grid gap-2">
              <Link to={`/posts/${postId}`} className={OUTLINE_BUTTON}>
                포스트 보기
                <OpenGlyph />
              </Link>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className={`inline-flex min-h-11 items-center gap-1.5 justify-self-start rounded px-0.5 text-body-sm font-medium text-text-secondary transition-colors hover:text-text-primary ${FOCUS_RING}`}
              >
                <HideGlyph />
                게시 취소
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <State glyph="○">게시 안 됨</State>
          {unpublishPost.isSuccess ? (
            <p role="status" className={DESCRIPTION}>
              게시를 취소했습니다. 다시 게시하면 같은 주소를 쓰고 조회수는 0부터 셉니다.
            </p>
          ) : (
            <p className={DESCRIPTION}>게시하면 posts 목록과 검색에 나오고, AI 요약을 만들기 시작합니다.</p>
          )}
          {!syncCompleted && (
            <p className="mt-2.5 text-label-sm tracking-normal text-text-muted">
              임베딩이 끝나기 전에도 게시할 수 있습니다. 의미 검색에는 임베딩이 끝난 뒤 나옵니다.
            </p>
          )}
          <div className="mt-3.5 grid">
            <button type="button" onClick={publish} disabled={publishPost.isPending} className={PUBLISH_BUTTON}>
              {publishPost.isPending ? <Spinner /> : <PublishGlyph />}
              {publishPost.isPending ? '게시하는 중...' : unpublishPost.isSuccess ? '다시 게시하기' : '게시하기'}
            </button>
          </div>
          {publishPost.isError && (
            <p role="alert" className="mt-3 text-body-sm text-text-primary">
              <span aria-hidden="true" className="font-mono">
                ✕{' '}
              </span>
              게시하지 못했습니다. {publishPost.error.message}
            </p>
          )}
        </>
      )}
    </section>
  );
}
