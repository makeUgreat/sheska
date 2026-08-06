import {
  useInfinitePostsScroll,
  usePostsArchive,
} from '@/features/posts-archive';
import { PostsListSection } from './posts-list-section';

export function PostsArchive() {
  const {
    query,
    setQuery,
    normalizedQuery,
    isSearching,
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

  return (
    <PostsListSection
      query={query}
      onQueryChange={setQuery}
      isLoading={isLoading}
      error={error}
      posts={posts}
      isSearching={isSearching}
      normalizedQuery={normalizedQuery}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      sentinelRef={sentinelRef}
    />
  );
}
