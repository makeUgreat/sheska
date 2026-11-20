import { useMemo } from 'react';
import { AskPost } from '@/features/ask-post';
import { usePost, type GetPostResponse } from '@/entities/post';
import { parseOutline } from '@/shared/lib';
import { PostArticleSection, type PostArticleState } from './post-article-section';

function getPostArticleState({
  isLoading,
  error,
  post,
}: {
  isLoading: boolean;
  error: Error | null;
  post: GetPostResponse | undefined;
}): PostArticleState {
  if (isLoading) return { status: 'loading' };
  if (error) return { status: 'error', error };
  if (!post) return { status: 'empty' };

  return { status: 'success', post };
}

export function PostArticle({ postId }: { postId: string | undefined }) {
  const { data: post, isLoading, error } = usePost(postId);
  const headings = useMemo(() => parseOutline(post?.body ?? ''), [post?.body]);
  const state = getPostArticleState({ isLoading, error, post });

  return (
    <>
      <PostArticleSection state={state} />
      {post && <AskPost key={post.postId} postId={post.postId} headings={headings} />}
    </>
  );
}
