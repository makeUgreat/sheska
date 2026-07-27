import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfinitePostsScroll } from '@/hooks/use-infinite-posts-scroll';

type IntersectionCallback = IntersectionObserverCallback;

const observers: MockIntersectionObserver[] = [];

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '0px';
  readonly thresholds: ReadonlyArray<number> = [];
  readonly callback: IntersectionCallback;

  constructor(callback: IntersectionCallback) {
    this.callback = callback;
    observers.push(this);
  }

  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn((): IntersectionObserverEntry[] => []);
  unobserve = vi.fn();

  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this);
  }
}

function InfiniteScrollHarness({
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
  const sentinelRef = useInfinitePostsScroll({
    enabled,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  return <div ref={sentinelRef} />;
}

describe('useInfinitePostsScroll', () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('enabled가 false면 observer를 만들지 않는다', () => {
    render(
      <InfiniteScrollHarness
        enabled={false}
        hasNextPage
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />,
    );

    expect(observers).toHaveLength(0);
  });

  it('sentinel이 보이고 다음 page가 있으면 fetchNextPage를 호출한다', () => {
    const fetchNextPage = vi.fn();
    render(
      <InfiniteScrollHarness
        enabled
        hasNextPage
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
      />,
    );

    observers[0].trigger(true);

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('다음 page가 없거나 이미 fetching 중이면 fetchNextPage를 호출하지 않는다', () => {
    const noNextPageFetch = vi.fn();
    const fetchingFetch = vi.fn();
    const { unmount } = render(
      <InfiniteScrollHarness
        enabled
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={noNextPageFetch}
      />,
    );

    observers[0].trigger(true);
    unmount();
    render(
      <InfiniteScrollHarness
        enabled
        hasNextPage
        isFetchingNextPage
        fetchNextPage={fetchingFetch}
      />,
    );
    observers[1].trigger(true);

    expect(noNextPageFetch).not.toHaveBeenCalled();
    expect(fetchingFetch).not.toHaveBeenCalled();
  });

  it('unmount되면 observer를 해제한다', () => {
    const { unmount } = render(
      <InfiniteScrollHarness
        enabled
        hasNextPage
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />,
    );

    unmount();

    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
  });
});
