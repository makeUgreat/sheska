import { type GetPostResponse } from '@/entities/post';
import { formatDate, type Heading } from '@/shared/lib';
import {
  ArticleLayout,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/shared/ui';

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

export function PostArticleSection({ state }: { state: PostArticleState }) {
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
    <ArticleLayout
      header={<PostHeader post={post} />}
      body={post.body}
      outline={outline}
      activeHeadingId={activeHeadingId}
    />
  );
}

function PostHeader({ post }: { post: GetPostResponse }) {
  return (
    <>
      <h1 className="break-words font-sans text-headline-lg text-text-primary">
        {post.title}
      </h1>
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-label-sm uppercase text-text-muted">
        <span>{formatDate(post.updatedAt)}</span>
        <span
          aria-hidden="true"
          className="h-1 w-1 rounded-full bg-outline-variant"
        />
        <span>{post.viewCount} views</span>
      </p>
    </>
  );
}
