import { type Ref } from 'react';
import { useInfinitePostViews, type PostView } from '@/entities/post';
import { useInfiniteScroll } from '@/shared/lib';
import { PostViewsSection, type PostViewsState } from './post-views-section';

function getPostViewsState({
  isLoading,
  error,
  views,
  hasNextPage,
  sentinelRef,
}: {
  isLoading: boolean;
  error: Error | null;
  views: PostView[];
  hasNextPage: boolean;
  sentinelRef: Ref<HTMLDivElement>;
}): PostViewsState {
  if (isLoading) return { status: 'loading' };
  if (error) return { status: 'error', error };
  if (views.length === 0) return { status: 'empty' };

  return { status: 'success', views, hasNextPage, sentinelRef };
}

export function PostViews({ postId }: { postId: string | undefined }) {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfinitePostViews(postId);
  const sentinelRef = useInfiniteScroll({ enabled: true, hasNextPage, isFetchingNextPage, fetchNextPage });
  const views = data?.pages.flatMap((page) => page.views) ?? [];
  const state = getPostViewsState({ isLoading, error, views, hasNextPage, sentinelRef });

  return <PostViewsSection state={state} />;
}
