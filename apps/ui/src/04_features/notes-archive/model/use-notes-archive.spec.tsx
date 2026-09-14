import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { type NoteSummary } from '@/entities/note';
import {
  HttpClientProvider,
  type HttpClientType as HttpClient,
} from '@/shared/api';
import { useNotesArchive } from './use-notes-archive';

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function buildNote(noteId: string, title: string): NoteSummary {
  return {
    noteId,
    sourceId: `source-${noteId}`,
    title,
    aliases: [],
    keywords: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function buildMockHttpClient(get: ReturnType<typeof vi.fn>): HttpClient {
  return { get, post: vi.fn(), patch: vi.fn() } as unknown as HttpClient;
}

function renderUseNotesArchive({
  client,
  initialEntry = '/',
}: {
  client: HttpClient;
  initialEntry?: string;
}) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <HttpClientProvider client={client}>{children}</HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return renderHook(() => useNotesArchive(), { wrapper });
}

describe('useNotesArchive', () => {
  it('listNotes 결과를 notes로 반환한다', async () => {
    const client = buildMockHttpClient(
      vi.fn().mockResolvedValue({
        notes: [buildNote('1', '첫 번째 노트')],
        nextCursor: null,
      }),
    );

    const { result } = renderUseNotesArchive({ client });

    await waitFor(() => {
      expect(result.current.notes).toHaveLength(1);
      expect(result.current.hasNextPage).toBe(false);
    });
  });

  it('limit query param을 listNotes 요청에 전달한다', async () => {
    const client = buildMockHttpClient(
      vi.fn().mockResolvedValue({ notes: [], nextCursor: null }),
    );

    renderUseNotesArchive({ client, initialEntry: '/?limit=25' });

    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/notes', { limit: '25' });
    });
  });

  it('nextCursor가 있으면 hasNextPage가 true다', async () => {
    const client = buildMockHttpClient(
      vi.fn().mockResolvedValue({
        notes: [buildNote('1', '노트')],
        nextCursor: 'cursor-2',
      }),
    );

    const { result } = renderUseNotesArchive({ client });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });
  });
});
