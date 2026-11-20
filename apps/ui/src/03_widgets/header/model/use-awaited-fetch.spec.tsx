import { act, renderHook } from '@testing-library/react';
import { InfiniteQueryObserver, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAwaitedFetch } from './use-awaited-fetch';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function renderUseAwaitedFetch(queryClient: QueryClient) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useAwaitedFetch(), { wrapper });
}

/** act 하나에 긴 시간을 넣으면 React가 render를 act 끝에 몰아서 해 시간 순서가 브라우저와 달라진다. */
const STEP_MS = 10;

async function advance(ms: number) {
  for (let passed = 0; passed < ms; passed += STEP_MS) {
    await act(() => vi.advanceTimersByTimeAsync(Math.min(STEP_MS, ms - passed)));
  }
}

describe('useAwaitedFetch', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    queryClient.clear();
    vi.useRealTimers();
  });

  it('200ms 안에 끝난 요청은 표시하지 않는다', async () => {
    const response = deferred<string>();
    const { result } = renderUseAwaitedFetch(queryClient);

    void queryClient.fetchQuery({ queryKey: ['post'], queryFn: () => response.promise }).catch(() => {});
    await advance(150);
    response.resolve('post');
    await advance(500);

    expect(result.current.waiting).toBe(false);
  });

  it('요청이 200ms를 넘기면 표시한다', async () => {
    const { result } = renderUseAwaitedFetch(queryClient);

    void queryClient.fetchQuery({ queryKey: ['post'], queryFn: () => deferred<string>().promise }).catch(() => {});
    await advance(250);

    expect(result.current.waiting).toBe(true);
  });

  it('표시한 뒤 요청이 끝나도 400ms를 채울 때까지 유지한다', async () => {
    const response = deferred<string>();
    const { result } = renderUseAwaitedFetch(queryClient);

    void queryClient.fetchQuery({ queryKey: ['post'], queryFn: () => response.promise }).catch(() => {});
    await advance(250);
    response.resolve('post');
    await advance(300);

    expect(result.current.waiting).toBe(true);
  });

  it('최소 유지 시간이 지나면 표시를 거둔다', async () => {
    const response = deferred<string>();
    const { result } = renderUseAwaitedFetch(queryClient);

    void queryClient.fetchQuery({ queryKey: ['post'], queryFn: () => response.promise }).catch(() => {});
    await advance(250);
    response.resolve('post');
    await advance(500);

    expect(result.current.waiting).toBe(false);
  });

  it('이미 데이터가 있는 query의 새로 고침은 표시하지 않는다', async () => {
    queryClient.setQueryData(['post'], 'post');
    const { result } = renderUseAwaitedFetch(queryClient);

    void queryClient.fetchQuery({ queryKey: ['post'], queryFn: () => deferred<string>().promise, staleTime: 0 }).catch(() => {});
    await advance(1000);

    expect(result.current.waiting).toBe(false);
  });

  it('다음 페이지 요청은 데이터가 있어도 표시한다', async () => {
    const observer = new InfiniteQueryObserver(queryClient, {
      queryKey: ['posts'],
      queryFn: ({ pageParam }) => (pageParam === 0 ? Promise.resolve('page 0') : deferred<string>().promise),
      initialPageParam: 0,
      getNextPageParam: (_last, pages) => pages.length,
    });
    const unsubscribe = observer.subscribe(() => {});
    await advance(STEP_MS);
    const { result } = renderUseAwaitedFetch(queryClient);

    void observer.fetchNextPage();
    await advance(250);

    expect(result.current.waiting).toBe(true);
    unsubscribe();
  });

  it('3초 전에는 경과 초를 주지 않는다', async () => {
    const { result } = renderUseAwaitedFetch(queryClient);

    void queryClient.fetchQuery({ queryKey: ['post'], queryFn: () => deferred<string>().promise }).catch(() => {});
    await advance(2900);

    expect(result.current.slowSeconds).toBeNull();
  });

  it('3초가 지나면 경과 초를 준다', async () => {
    const { result } = renderUseAwaitedFetch(queryClient);

    void queryClient.fetchQuery({ queryKey: ['post'], queryFn: () => deferred<string>().promise }).catch(() => {});
    await advance(4100);

    expect(result.current.slowSeconds).toBe(4);
  });
});
