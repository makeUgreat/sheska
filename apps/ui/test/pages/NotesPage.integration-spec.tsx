import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type GetNoteResponse, type NoteSummary } from '@/entities/note';
import { NotesPage } from '@/pages/notes';
import {
  HttpClientProvider,
  type HttpClientType as HttpClient,
} from '@/shared/api';

const NOW = '2026-01-05T12:00:00.000Z';

const NOTES: NoteSummary[] = [
  {
    noteId: 'note-1',
    sourceId: 'source-1',
    title: '첫 번째 노트',
    aliases: [],
    keywords: ['architecture'],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    noteId: 'note-2',
    sourceId: 'source-2',
    title: '두 번째 노트',
    aliases: [],
    keywords: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const SECOND_NOTE: GetNoteResponse = {
  ...NOTES[1],
  externalSourceId: 'second.md',
  frontmatter: {},
  body: ['## 제목', '', '두 번째 노트의 첫 문단이다.'].join('\n'),
};

function buildMockHttpClient(get: ReturnType<typeof vi.fn>): HttpClient {
  return { get, post: vi.fn(), patch: vi.fn() } as unknown as HttpClient;
}

function renderPage(client: HttpClient) {
  return render(
    <MemoryRouter>
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <HttpClientProvider client={client}>
          <NotesPage />
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('NotesPage', () => {
  it('note 목록을 상세 링크로 렌더링한다', async () => {
    const get = vi.fn().mockResolvedValue({ notes: NOTES, nextCursor: null });

    renderPage(buildMockHttpClient(get));

    const link = await screen.findByRole('link', { name: /첫 번째 노트/ });
    expect(link.getAttribute('href')).toBe('/notes/note-1');
  });

  it('목록을 열기만 해서는 note 본문을 불러오지 않는다', async () => {
    const get = vi.fn().mockResolvedValue({ notes: NOTES, nextCursor: null });

    renderPage(buildMockHttpClient(get));

    await screen.findByRole('link', { name: /첫 번째 노트/ });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toBe('/notes');
  });

  it('항목에 머무르면 그 note의 첫 문단을 미리보기에 보여준다', async () => {
    const user = userEvent.setup();
    const get = vi.fn((path: string) =>
      Promise.resolve(
        path === '/notes/note-2'
          ? SECOND_NOTE
          : { notes: NOTES, nextCursor: null },
      ),
    );

    renderPage(buildMockHttpClient(get));

    await user.hover(await screen.findByRole('link', { name: /두 번째 노트/ }));

    await waitFor(() => {
      expect(screen.getByText('두 번째 노트의 첫 문단이다.')).toBeDefined();
    });
    expect(get).toHaveBeenCalledWith('/notes/note-2');
  });
});
