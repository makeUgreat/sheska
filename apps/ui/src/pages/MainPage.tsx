import { Footer } from '@/shared/layout/footer';
import { PostsLandingView } from '@/features/posts/components/posts-landing-view';
import { PostsListSection } from '@/features/posts/components/posts-list-section';
import { useInfinitePostsScroll } from '@/features/posts/hooks/use-infinite-posts-scroll';
import { usePostsArchive } from '@/features/posts/hooks/use-posts-archive';
import {
  usePostsEntryTransitionEffects,
  usePostsEntryTransitionState,
} from '@/features/posts/hooks/use-posts-entry-transition';

export function MainPage() {
  const entryTransition = usePostsEntryTransitionState();
  const {
    query,
    setQuery,
    normalizedQuery,
    isSearching,
    posts,
    totalPostCount,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    resetPostsCache,
  } = usePostsArchive(entryTransition.shouldLoadPosts);
  const resetToTop = usePostsEntryTransitionEffects({
    transition: entryTransition,
    isLoading,
    onResetPostsCache: resetPostsCache,
  });
  const sentinelRef = useInfinitePostsScroll({
    enabled: entryTransition.hasEnteredPosts,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  return (
    <main>
      {!entryTransition.hasEnteredPosts && (
        <PostsLandingView
          query={query}
          onQueryChange={setQuery}
          totalPostCount={totalPostCount}
          isCatchingPostsEntry={entryTransition.isCatchingPostsEntry}
          isPreparingPosts={entryTransition.isPreparingPosts}
          postsEntryRef={entryTransition.postsEntryRef}
        />
      )}

      {entryTransition.shouldRenderPosts && (
        <>
          <PostsListSection
            ref={entryTransition.postsSectionRef}
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
            onResetToTop={resetToTop}
          />
          {entryTransition.hasEnteredPosts && <Footer />}
        </>
      )}
    </main>
  );
}
