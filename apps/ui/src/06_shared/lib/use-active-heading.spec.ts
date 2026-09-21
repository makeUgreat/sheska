import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useActiveHeading } from '@/shared/lib';

type TriggeredEntry = { id: string; isIntersecting: boolean; top: number };

const observers: MockIntersectionObserver[] = [];

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number> = [];
  readonly callback: IntersectionObserverCallback;
  readonly observed: Element[] = [];

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.rootMargin = options?.rootMargin ?? '0px';
    observers.push(this);
  }

  disconnect = vi.fn();
  observe = vi.fn((element: Element) => {
    this.observed.push(element);
  });
  takeRecords = vi.fn((): IntersectionObserverEntry[] => []);
  unobserve = vi.fn();

  trigger(entries: TriggeredEntry[]) {
    act(() => {
      this.callback(
        entries.map(
          ({ id, isIntersecting, top }) =>
            ({
              target: document.getElementById(id),
              isIntersecting,
              boundingClientRect: { top },
            }) as unknown as IntersectionObserverEntry,
        ),
        this,
      );
    });
  }

  observedIds() {
    return this.observed.map((element) => element.id);
  }
}

function placeHeadings(...ids: string[]) {
  document.body.innerHTML = ids.map((id) => `<h2 id="${id}"></h2>`).join('');
}

describe('useActiveHeading', () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('관찰할 heading id가 없으면 활성 heading이 없다', () => {
    const { result } = renderHook(() => useActiveHeading([]));

    expect(result.current).toBeNull();
    expect(observers).toHaveLength(0);
  });

  it('id에 해당하는 element가 없으면 observer를 만들지 않는다', () => {
    const { result } = renderHook(() => useActiveHeading(['layers']));

    expect(result.current).toBeNull();
    expect(observers).toHaveLength(0);
  });

  it('마운트 직후 첫 heading을 활성으로 표시한다', () => {
    placeHeadings('layers', 'slices', 'segments');

    const { result } = renderHook(() =>
      useActiveHeading(['layers', 'slices', 'segments']),
    );

    expect(result.current).toBe('layers');
  });

  it('DOM에 있는 heading만 관찰한다', () => {
    placeHeadings('layers', 'segments');

    renderHook(() => useActiveHeading(['layers', 'removed', 'segments']));

    expect(observers[0].observedIds()).toEqual(['layers', 'segments']);
  });

  it('교차한 heading이 여러 개면 가장 위쪽을 활성으로 표시한다', () => {
    placeHeadings('layers', 'slices', 'segments');
    const { result } = renderHook(() =>
      useActiveHeading(['layers', 'slices', 'segments']),
    );

    observers[0].trigger([
      { id: 'segments', isIntersecting: true, top: 240 },
      { id: 'slices', isIntersecting: true, top: 60 },
    ]);

    expect(result.current).toBe('slices');
  });

  it('교차하지 않은 heading은 활성 후보에서 제외한다', () => {
    placeHeadings('layers', 'slices');
    const { result } = renderHook(() => useActiveHeading(['layers', 'slices']));

    observers[0].trigger([
      { id: 'layers', isIntersecting: false, top: -400 },
      { id: 'slices', isIntersecting: true, top: 80 },
    ]);

    expect(result.current).toBe('slices');
  });

  it('교차한 heading이 없으면 직전 활성 heading을 유지한다', () => {
    placeHeadings('layers', 'slices');
    const { result } = renderHook(() => useActiveHeading(['layers', 'slices']));

    observers[0].trigger([{ id: 'slices', isIntersecting: true, top: 40 }]);
    observers[0].trigger([
      { id: 'layers', isIntersecting: false, top: -600 },
      { id: 'slices', isIntersecting: false, top: -200 },
    ]);

    expect(result.current).toBe('slices');
  });

  it('같은 id 목록이면 observer를 다시 만들지 않는다', () => {
    placeHeadings('layers', 'slices');
    const { rerender } = renderHook(({ ids }) => useActiveHeading(ids), {
      initialProps: { ids: ['layers', 'slices'] },
    });

    rerender({ ids: ['layers', 'slices'] });

    expect(observers).toHaveLength(1);
  });

  it('id 목록이 바뀌면 새 heading을 다시 관찰한다', () => {
    placeHeadings('layers', 'slices');
    const { rerender } = renderHook(({ ids }) => useActiveHeading(ids), {
      initialProps: { ids: ['layers'] },
    });

    rerender({ ids: ['layers', 'slices'] });

    expect(observers).toHaveLength(2);
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(observers[1].observedIds()).toEqual(['layers', 'slices']);
  });

  it('unmount되면 observer를 해제한다', () => {
    placeHeadings('layers', 'slices');
    const { unmount } = renderHook(() =>
      useActiveHeading(['layers', 'slices']),
    );

    unmount();

    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
  });
});
