import { useEffect, useRef } from 'react';

/** 목록 끝에 둔 sentinel이 화면에 들어오면 다음 페이지를 부른다. */
export function useInfiniteScroll({
  enabled,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  enabled: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !enabled) return;
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
  }, [enabled, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return sentinelRef;
}
