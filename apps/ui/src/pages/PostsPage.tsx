import { Footer } from '@/shared/layout/footer';
import { PostsListSection } from '@/features/posts/components/posts-list-section';
import { useInfinitePostsScroll } from '@/features/posts/hooks/use-infinite-posts-scroll';
import { usePostsArchive } from '@/features/posts/hooks/use-posts-archive';

export function PostsPage() {
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
    <main>
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
      <Footer />
    </main>
  );
}
