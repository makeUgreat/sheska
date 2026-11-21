import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStagedReveal } from './use-staged-reveal';

const HOLD_MS = 700;

const observers: MockIntersectionObserver[] = [];

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '0px';
  readonly thresholds: ReadonlyArray<number> = [];
  readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
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

function RevealHarness({ id, ready }: { id: string; ready: boolean }) {
  const { ref, phase } = useStagedReveal(id, { ready, holdMs: HOLD_MS });

  return <p ref={ref}>{phase}</p>;
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query === '(prefers-reduced-motion: reduce)' }));
}

describe('useStagedReveal', () => {
  beforeEach(() => {
    observers.length = 0;
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('화면에 들어오기 전에는 시간이 지나도 붙잡아 둔다', () => {
    render(<RevealHarness id="post-offscreen" ready />);

    act(() => {
      vi.advanceTimersByTime(HOLD_MS * 3);
    });

    expect(screen.getByText('holding')).toBeDefined();
  });

  it('화면에 들어온 뒤 붙잡는 시간이 지나면 드러낸다', () => {
    render(<RevealHarness id="post-visible" ready />);

    act(() => observers[0].trigger(true));
    act(() => {
      vi.advanceTimersByTime(HOLD_MS - 1);
    });
    expect(screen.getByText('holding')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText('revealing')).toBeDefined();
  });

  it('한 번 드러낸 key는 다시 그려도 바로 보여 준다', () => {
    const first = render(<RevealHarness id="post-seen" ready />);
    act(() => observers[0].trigger(true));
    act(() => {
      vi.advanceTimersByTime(HOLD_MS);
    });
    first.unmount();

    render(<RevealHarness id="post-seen" ready />);

    expect(screen.getByText('shown')).toBeDefined();
  });

  it('작성 중이던 내용이 완성되면 붙잡지 않고 바로 드러낸다', () => {
    const { rerender } = render(<RevealHarness id="post-written" ready={false} />);

    rerender(<RevealHarness id="post-written" ready />);

    expect(screen.getByText('revealing')).toBeDefined();
  });

  it('움직임을 줄이는 설정이면 붙잡지 않고 보여 준다', () => {
    stubReducedMotion(true);

    render(<RevealHarness id="post-reduced" ready />);

    expect(screen.getByText('shown')).toBeDefined();
  });
});
