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
      <h1 className="break-words font-sans text-headline-md text-text-primary">
        {post.title}
      </h1>
      <p className="mt-2 flex flex-wrap gap-x-2 text-body-md text-text-muted">
        <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
        <span aria-hidden="true">·</span>
        <span>{post.viewCount} views</span>
      </p>
    </>
  );
}
