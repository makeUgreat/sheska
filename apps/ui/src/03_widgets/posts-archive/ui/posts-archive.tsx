import { type Ref } from 'react';
import {
  useInfinitePostsScroll,
  usePostsArchive,
} from '@/features/posts-archive';
import { type PostSummary } from '@/entities/post';
import {
  PostsListSection,
  type PostsListState,
  type PostsSearchMode,
} from './posts-list-section';

function getSearchMode(semanticSearchApplied: boolean | null): PostsSearchMode {
  if (semanticSearchApplied === null) return null;

  return semanticSearchApplied ? 'smart' : 'basic';
}

function getPostsListState({
  isLoading,
  error,
  posts,
  hasNextPage,
  isFetchingNextPage,
  sentinelRef,
}: {
  isLoading: boolean;
  error: Error | null;
  posts: PostSummary[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  sentinelRef: Ref<HTMLDivElement>;
}): PostsListState {
  if (isLoading) return { status: 'loading' };
  if (error) return { status: 'error', error };
  if (posts.length === 0) return { status: 'empty' };

  return {
    status: 'success',
    posts,
    hasNextPage,
    isFetchingNextPage,
    sentinelRef,
  };
}

export function PostsArchive() {
  const {
    query,
    setQuery,
    normalizedQuery,
    isSearching,
    semanticSearchApplied,
    posts,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePostsArchive();
  const sentinelRef = useInfinitePostsScroll({
    enabled: true,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });
  const searchMode = getSearchMode(semanticSearchApplied);
  const state = getPostsListState({
    isLoading,
    error,
    posts,
    hasNextPage,
    isFetchingNextPage,
    sentinelRef,
  });

  return (
    <PostsListSection
      search={{
        query,
        onQueryChange: setQuery,
        normalizedQuery: isSearching ? normalizedQuery : '',
        mode: searchMode,
      }}
      state={state}
    />
  );
}
