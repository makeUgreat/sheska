import { usePost, type GetPostResponse } from '@/entities/post';
import { useArticleOutline, type Heading } from '@/shared/lib';
import {
  PostArticleSection,
  type PostArticleState,
} from './post-article-section';

function getPostArticleState({
  isLoading,
  error,
  post,
  outline,
  activeHeadingId,
}: {
  isLoading: boolean;
  error: Error | null;
  post: GetPostResponse | undefined;
  outline: Heading[];
  activeHeadingId: string | null;
}): PostArticleState {
  if (isLoading) return { status: 'loading' };
  if (error) return { status: 'error', error };
  if (!post) return { status: 'empty' };

  return { status: 'success', post, outline, activeHeadingId };
}

export function PostArticle({ postId }: { postId: string | undefined }) {
  const { data: post, isLoading, error } = usePost(postId);
  const { outline, activeHeadingId } = useArticleOutline(post?.body);
  const state = getPostArticleState({
    isLoading,
    error,
    post,
    outline,
    activeHeadingId,
  });

  return <PostArticleSection state={state} />;
}
