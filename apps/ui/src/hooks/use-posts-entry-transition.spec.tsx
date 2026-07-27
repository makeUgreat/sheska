import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  usePostsEntryTransitionEffects,
  usePostsEntryTransitionState,
} from '@/hooks/use-posts-entry-transition';

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

type TransitionSnapshot = ReturnType<typeof usePostsEntryTransitionState>;

let latest:
  | {
      transition: TransitionSnapshot;
      resetToTop: () => void;
    }
  | undefined;

function TransitionHarness({
  isLoading,
  onResetPostsCache,
}: {
  isLoading: boolean;
  onResetPostsCache: () => void;
}) {
  const transition = usePostsEntryTransitionState();
  const resetToTop = usePostsEntryTransitionEffects({
    transition,
    isLoading,
    onResetPostsCache,
  });
  latest = { transition, resetToTop };

  return (
    <>
      <div ref={transition.postsEntryRef} />
      <section ref={transition.postsSectionRef} />
    </>
  );
}

function renderTransitionHarness({
  isLoading = false,
  onResetPostsCache = vi.fn(),
}: {
  isLoading?: boolean;
  onResetPostsCache?: () => void;
} = {}) {
  latest = undefined;
  return {
    onResetPostsCache,
    ...render(
      <TransitionHarness
        isLoading={isLoading}
        onResetPostsCache={onResetPostsCache}
      />,
    ),
  };
}

function startEntryCatch() {
  act(() => {
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 700 }));
    observers[0].trigger(true);
  });
}

describe('usePostsEntryTransitionState', () => {
  it('초기 상태에서는 post 목록을 load하거나 render하지 않는다', () => {
    const { result } = renderHook(() => usePostsEntryTransitionState());

    expect(result.current.isCatchingPostsEntry).toBe(false);
    expect(result.current.isPreparingPosts).toBe(false);
    expect(result.current.hasEnteredPosts).toBe(false);
    expect(result.current.shouldLoadPosts).toBe(false);
    expect(result.current.shouldRenderPosts).toBe(false);
  });

  it('preparing 상태가 되면 post 목록 load와 render가 활성화된다', () => {
    const { result } = renderHook(() => usePostsEntryTransitionState());

    act(() => {
      result.current.setIsPreparingPosts(true);
    });

    expect(result.current.shouldLoadPosts).toBe(true);
    expect(result.current.shouldRenderPosts).toBe(true);
  });
});

describe('usePostsEntryTransitionEffects', () => {
  const scrollTo = vi.fn();
  const scrollBy = vi.fn();
  const requestAnimationFrame = vi.fn(() => 1);
  const cancelAnimationFrame = vi.fn();

  beforeEach(() => {
    observers.length = 0;
    latest = undefined;
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    vi.stubGlobal('scrollTo', scrollTo);
    vi.stubGlobal('scrollBy', scrollBy);
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
    Element.prototype.scrollIntoView = vi.fn();
    scrollTo.mockClear();
    scrollBy.mockClear();
    requestAnimationFrame.mockClear();
    cancelAnimationFrame.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('scroll threshold를 넘고 entry가 보이면 catch 상태로 진입한다', () => {
    renderTransitionHarness();

    startEntryCatch();

    expect(latest?.transition.isCatchingPostsEntry).toBe(true);
    expect(latest?.transition.isPreparingPosts).toBe(false);
    expect(requestAnimationFrame).toHaveBeenCalled();
  });

  it('catch delay가 지나면 preparing 상태로 전환한다', () => {
    renderTransitionHarness();
    startEntryCatch();

    act(() => {
      vi.advanceTimersByTime(620);
    });

    expect(latest?.transition.isCatchingPostsEntry).toBe(false);
    expect(latest?.transition.isPreparingPosts).toBe(true);
    expect(latest?.transition.shouldLoadPosts).toBe(true);
  });

  it('최소 대기 시간과 loading 완료 후 entered 상태로 전환한다', () => {
    const { rerender } = renderTransitionHarness({ isLoading: true });
    startEntryCatch();
    act(() => {
      vi.advanceTimersByTime(620);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(latest?.transition.isPreparingPosts).toBe(true);
    expect(latest?.transition.hasEnteredPosts).toBe(false);

    rerender(
      <TransitionHarness isLoading={false} onResetPostsCache={vi.fn()} />,
    );
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(latest?.transition.isPreparingPosts).toBe(false);
    expect(latest?.transition.isRevealingPosts).toBe(false);
    expect(latest?.transition.hasEnteredPosts).toBe(true);
  });

  it('resetToTop은 상태와 cache를 초기화하고 top으로 스크롤한다', () => {
    const onResetPostsCache = vi.fn();
    renderTransitionHarness({ onResetPostsCache });
    startEntryCatch();
    act(() => {
      vi.advanceTimersByTime(620);
    });

    act(() => {
      latest?.resetToTop();
    });
    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(latest?.transition.isCatchingPostsEntry).toBe(false);
    expect(latest?.transition.isPreparingPosts).toBe(false);
    expect(latest?.transition.hasEnteredPosts).toBe(false);
    expect(onResetPostsCache).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });

  it('unmount되면 observer와 timer를 정리한다', () => {
    const { unmount } = renderTransitionHarness();
    startEntryCatch();

    unmount();

    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});
