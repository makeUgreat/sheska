import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from '@/pages/LandingPage';
import { type HttpClient } from '@/shared/api/http';
import { HttpClientProvider } from '@/shared/api/http-client-context';

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function buildMockHttpClient({
  countPosts = vi.fn().mockResolvedValue({ count: 0 }),
}: {
  countPosts?: ReturnType<typeof vi.fn>;
} = {}): HttpClient {
  return {
    get: vi.fn((path: string) => {
      if (path === '/posts/count') return countPosts() as Promise<unknown>;
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    }),
    post: vi.fn(),
    patch: vi.fn(),
  } as unknown as HttpClient;
}

function renderPage(client: HttpClient) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={createTestQueryClient()}>
        <HttpClientProvider client={client}>
          <LandingPage />
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  it('terminal landing hero를 렌더링한다', () => {
    const client = buildMockHttpClient();

    renderPage(client);

    expect(screen.getByRole('heading', { name: 'HASH' })).toBeDefined();
    expect(screen.getByLabelText('Search posts')).toBeDefined();
    expect(screen.getByText('The Garden')).toBeDefined();
  });

  it('scroll indicator는 posts archive route로 연결된다', () => {
    const client = buildMockHttpClient();

    renderPage(client);

    const indicator = screen.getByText('Scroll For Articles').closest('a');
    expect(indicator?.className).toContain('animate-bounce');
    expect(indicator?.getAttribute('href')).toBe('/posts');
  });

  it('terminal note count는 count API 응답으로 보여준다', async () => {
    const countPosts = vi.fn().mockResolvedValue({ count: 7 });
    const client = buildMockHttpClient({ countPosts });

    renderPage(client);

    await waitFor(() => {
      expect(countPosts).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/- 7 notes found in \/posts/)).toBeDefined();
    });
  });
});
