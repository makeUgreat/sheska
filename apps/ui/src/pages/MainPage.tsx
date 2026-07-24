import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  useCountPosts,
  useInfiniteListPosts,
  useInfiniteSearchPosts,
} from '@/api/queries';
import { Footer } from '@/components/layout/footer';
import { PostsLandingView } from '@/components/post/posts-landing-view';
import { PostsListSection } from '@/components/post/posts-list-section';

const POSTS_ENTRY_MIN_LOADING_MS = 720;
const POSTS_ENTRY_CATCH_DELAY_MS = 620;
const POSTS_ENTRY_SCROLL_THRESHOLD = 560;
const POSTS_ENTRY_SCROLL_RESET_MS = 260;

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function MainPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const normalizedQuery = debouncedQuery.trim();
  const isSearching = normalizedQuery.length >= 1;
  const [isPostsEntryArmed, setIsPostsEntryArmed] = useState(false);
  const [isCatchingPostsEntry, setIsCatchingPostsEntry] = useState(false);
  const [isPreparingPosts, setIsPreparingPosts] = useState(false);
  const [entryMinWaitComplete, setEntryMinWaitComplete] = useState(false);
  const [hasEnteredPosts, setHasEnteredPosts] = useState(false);
  const shouldLoadPosts = isPreparingPosts || hasEnteredPosts;

  const countResult = useCountPosts();
  const listResult = useInfiniteListPosts(limit, shouldLoadPosts);
  const searchResult = useInfiniteSearchPosts(
    normalizedQuery,
    limit,
    shouldLoadPosts,
  );
  const result = isSearching ? searchResult : listResult;
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = result;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const postsEntryRef = useRef<HTMLDivElement>(null);
  const postsSectionRef = useRef<HTMLElement>(null);
  const entryScrollDistanceRef = useRef(0);
  const entryScrollResetTimerRef = useRef<number | undefined>(undefined);
  const entryCatchTimerRef = useRef<number | undefined>(undefined);
  const entryScrollClampFrameRef = useRef<number | undefined>(undefined);
  const entryTouchYRef = useRef<number | undefined>(undefined);

  const stopEntryScrollClamp = useCallback(() => {
    if (entryScrollClampFrameRef.current) {
      window.cancelAnimationFrame(entryScrollClampFrameRef.current);
      entryScrollClampFrameRef.current = undefined;
    }
  }, []);

  const startEntryScrollClamp = useCallback(
    (scrollY: number) => {
      stopEntryScrollClamp();

      const clamp = () => {
        if (window.scrollY > scrollY) {
          window.scrollTo({ top: scrollY, behavior: 'instant' });
        }
        entryScrollClampFrameRef.current = window.requestAnimationFrame(clamp);
      };

      entryScrollClampFrameRef.current = window.requestAnimationFrame(clamp);
    },
    [stopEntryScrollClamp],
  );

  const startPostsEntryCatch = useCallback(() => {
    if (hasEnteredPosts || isCatchingPostsEntry || isPreparingPosts) return;

    startEntryScrollClamp(window.scrollY);
    setIsPostsEntryArmed(false);
    setIsCatchingPostsEntry(true);
    entryScrollDistanceRef.current = 0;

    if (entryCatchTimerRef.current) {
      window.clearTimeout(entryCatchTimerRef.current);
    }
    entryCatchTimerRef.current = window.setTimeout(() => {
      stopEntryScrollClamp();
      setIsCatchingPostsEntry(false);
      setIsPreparingPosts(true);
      setEntryMinWaitComplete(false);
    }, POSTS_ENTRY_CATCH_DELAY_MS);
  }, [
    hasEnteredPosts,
    isCatchingPostsEntry,
    isPreparingPosts,
    startEntryScrollClamp,
    stopEntryScrollClamp,
  ]);

  const addEntryScrollDistance = useCallback(
    (distance: number) => {
      if (distance <= 0 || hasEnteredPosts || isCatchingPostsEntry) return;

      entryScrollDistanceRef.current += distance;

      if (entryScrollResetTimerRef.current) {
        window.clearTimeout(entryScrollResetTimerRef.current);
      }
      entryScrollResetTimerRef.current = window.setTimeout(() => {
        entryScrollDistanceRef.current = 0;
      }, POSTS_ENTRY_SCROLL_RESET_MS);

      if (
        isPostsEntryArmed &&
        entryScrollDistanceRef.current >= POSTS_ENTRY_SCROLL_THRESHOLD
      ) {
        startPostsEntryCatch();
      }
    },
    [
      hasEnteredPosts,
      isCatchingPostsEntry,
      isPostsEntryArmed,
      startPostsEntryCatch,
    ],
  );

  useEffect(() => {
    if (hasEnteredPosts || isCatchingPostsEntry || isPreparingPosts) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const el = postsEntryRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsPostsEntryArmed(true);
          if (entryScrollDistanceRef.current >= POSTS_ENTRY_SCROLL_THRESHOLD) {
            startPostsEntryCatch();
          }
        } else {
          setIsPostsEntryArmed(false);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [
    hasEnteredPosts,
    isCatchingPostsEntry,
    isPreparingPosts,
    startPostsEntryCatch,
  ]);

  useEffect(() => {
    if (hasEnteredPosts || isCatchingPostsEntry || isPreparingPosts) return;

    const handleWheel = (event: WheelEvent) => {
      addEntryScrollDistance(event.deltaY);
    };
    const handleTouchStart = (event: TouchEvent) => {
      entryTouchYRef.current = event.touches[0]?.clientY;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY;
      const previousY = entryTouchYRef.current;
      if (currentY === undefined || previousY === undefined) return;

      addEntryScrollDistance(previousY - currentY);
      entryTouchYRef.current = currentY;
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [
    addEntryScrollDistance,
    hasEnteredPosts,
    isCatchingPostsEntry,
    isPreparingPosts,
  ]);

  useEffect(() => {
    return () => {
      if (entryScrollResetTimerRef.current) {
        window.clearTimeout(entryScrollResetTimerRef.current);
      }
      if (entryCatchTimerRef.current) {
        window.clearTimeout(entryCatchTimerRef.current);
      }
      stopEntryScrollClamp();
    };
  }, [stopEntryScrollClamp]);

  useEffect(() => {
    if (!isPreparingPosts || hasEnteredPosts) return;

    const timer = window.setTimeout(() => {
      setEntryMinWaitComplete(true);
    }, POSTS_ENTRY_MIN_LOADING_MS);

    return () => window.clearTimeout(timer);
  }, [hasEnteredPosts, isPreparingPosts]);

  useEffect(() => {
    if (!isPreparingPosts || hasEnteredPosts || !entryMinWaitComplete) return;
    if (isLoading) return;

    setIsPreparingPosts(false);
    setHasEnteredPosts(true);
  }, [entryMinWaitComplete, hasEnteredPosts, isLoading, isPreparingPosts]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasEnteredPosts) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasEnteredPosts, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useLayoutEffect(() => {
    if (!hasEnteredPosts) return;

    const section = postsSectionRef.current;
    if (!section) return;

    section.scrollIntoView({ block: 'start', behavior: 'smooth' });
    section.focus({ preventScroll: true });
  }, [hasEnteredPosts]);

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];
  const totalPostCount = countResult.data?.count ?? 0;

  const resetToTop = () => {
    if (entryCatchTimerRef.current) {
      window.clearTimeout(entryCatchTimerRef.current);
    }
    stopEntryScrollClamp();
    setIsCatchingPostsEntry(false);
    setIsPostsEntryArmed(false);
    setIsPreparingPosts(false);
    setEntryMinWaitComplete(false);
    setHasEnteredPosts(false);
    entryScrollDistanceRef.current = 0;
    queryClient.removeQueries({ queryKey: ['posts', 'infinite'] });
    queryClient.removeQueries({ queryKey: ['posts', 'search'] });
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  return (
    <main>
      {!hasEnteredPosts && (
        <PostsLandingView
          query={query}
          onQueryChange={setQuery}
          totalPostCount={totalPostCount}
          isCatchingPostsEntry={isCatchingPostsEntry}
          isPreparingPosts={isPreparingPosts}
          postsEntryRef={postsEntryRef}
        />
      )}

      {hasEnteredPosts && (
        <>
          <PostsListSection
            ref={postsSectionRef}
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
          <Footer />
        </>
      )}
    </main>
  );
}
