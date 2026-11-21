import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ListPostViewsResponse } from '@/entities/post';
import { PostViewsPage } from '@/pages/post-views';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';

const observers: Array<{ trigger: () => void }> = [];

class MockIntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {
    observers.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);

  trigger() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

function at(day: number, hours: number, minutes: number) {
  return new Date(2026, 10, day, hours, minutes).toISOString();
}

const FIRST_PAGE: ListPostViewsResponse = {
  views: [
    { viewedAt: at(21, 14, 5), ip: '203.0.113.24', client: 'Mozilla/5.0 (Macintosh) Chrome/131.0.0.0' },
    { viewedAt: at(21, 11, 48), ip: '192.0.2.15', client: 'unknown' },
    { viewedAt: at(20, 22, 40), ip: '198.51.100.42', client: 'Mozilla/5.0 (Windows NT 10.0) Firefox/132.0' },
  ],
  nextCursor: 'cursor-2',
};

const SECOND_PAGE: ListPostViewsResponse = {
  views: [{ viewedAt: at(19, 9, 12), ip: '66.249.66.1', client: 'Googlebot/2.1' }],
  nextCursor: null,
};

function buildClient(get: ReturnType<typeof vi.fn>): HttpClient {
  return { get, post: vi.fn().mockResolvedValue(undefined), patch: vi.fn(), postStream: vi.fn() } as unknown as HttpClient;
}

function renderPage(client: HttpClient) {
  return render(
    <MemoryRouter initialEntries={['/posts/post-1/views']}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <HttpClientProvider client={client}>
          <Routes>
            <Route path="/posts/:id/views" element={<PostViewsPage />} />
          </Routes>
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function rowTexts() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    );
}

describe('PostViewsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    observers.length = 0;
  });

  it('조회내역을 시각, IP, 방문 수단 순서로 그린다', async () => {
    renderPage(buildClient(vi.fn().mockResolvedValue({ ...FIRST_PAGE, nextCursor: null })));

    await screen.findByRole('table');
    expect(rowTexts()).toEqual([
      ['11.21 14:05', '203.0.113.24', 'Mozilla/5.0 (Macintosh) Chrome/131.0.0.0'],
      ['11.21 11:48', '192.0.2.15', 'unknown'],
      ['11.20 22:40', '198.51.100.42', 'Mozilla/5.0 (Windows NT 10.0) Firefox/132.0'],
    ]);
    expect(screen.getByText('End of history')).toBeDefined();
  });

  it('방문 수단은 hover로 원문 전체를 보인다', async () => {
    renderPage(buildClient(vi.fn().mockResolvedValue({ ...FIRST_PAGE, nextCursor: null })));

    const cell = await screen.findByRole('cell', { name: 'Mozilla/5.0 (Macintosh) Chrome/131.0.0.0' });
    expect(cell.getAttribute('title')).toBe('Mozilla/5.0 (Macintosh) Chrome/131.0.0.0');
  });

  it('날짜가 바뀌는 행을 그날의 첫 행으로 표시한다', async () => {
    renderPage(buildClient(vi.fn().mockResolvedValue({ ...FIRST_PAGE, nextCursor: null })));

    await screen.findByRole('table');
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => row.hasAttribute('data-starts-day'))).toEqual([false, false, true]);
  });

  it('목록 끝에 닿으면 다음 페이지를 받아 이어 붙인다', async () => {
    const get = vi.fn((_path: string, _schema: unknown, params?: Record<string, string>) =>
      Promise.resolve(params?.cursor === 'cursor-2' ? SECOND_PAGE : FIRST_PAGE),
    );
    renderPage(buildClient(get));

    await screen.findByRole('table');
    await waitFor(() => expect(observers.length).toBeGreaterThan(0));
    observers.at(-1)?.trigger();

    await screen.findByRole('cell', { name: '66.249.66.1' });
    expect(get).toHaveBeenLastCalledWith('/posts/post-1/views', expect.anything(), { cursor: 'cursor-2' });
    expect(rowTexts()).toHaveLength(4);
  });

  it('권한이 없으면 상태 코드와 함께 실패를 알린다', async () => {
    renderPage(buildClient(vi.fn().mockRejectedValue(new HttpError(401, 'Unauthorized'))));

    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getByText('401')).toBeDefined();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('조회내역이 없으면 빈 상태를 보인다', async () => {
    renderPage(buildClient(vi.fn().mockResolvedValue({ views: [], nextCursor: null })));

    expect(await screen.findByText('Nothing has been collected yet.')).toBeDefined();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('돌아가는 링크는 그 글로 간다', () => {
    renderPage(buildClient(vi.fn().mockReturnValue(new Promise(() => {}))));

    expect(screen.getByRole('link', { name: 'Back to post' }).getAttribute('href')).toBe('/posts/post-1');
  });
});
