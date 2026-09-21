import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type GetNoteResponse } from '@/entities/note';
import { NoteDetailPage } from '@/pages/note-detail';
import {
  HttpClientProvider,
  type HttpClientType as HttpClient,
} from '@/shared/api';

type MockHttpClientOverrides = {
  get?: ReturnType<typeof vi.fn>;
  post?: ReturnType<typeof vi.fn>;
  patch?: ReturnType<typeof vi.fn>;
};

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const NOW = '2026-01-05T12:00:00.000Z';
const MOCK_NOTE: GetNoteResponse = {
  noteId: 'note-1',
  sourceId: 'source-1',
  externalSourceId: 'obsidian-1',
  title: '테스트 노트',
  aliases: ['Test Note'],
  keywords: ['architecture', 'fsd'],
  frontmatter: {},
  body: [
    'Layers point downward, see [[feature-sliced-design|FSD]].',
    '',
    '## Layers',
    '',
    'A page composes widgets.',
    '',
    '## Segments',
    '',
    'A slice exposes its public API.',
  ].join('\n'),
  createdAt: NOW,
  updatedAt: NOW,
};

function buildMockHttpClient(
  overrides: MockHttpClientOverrides = {},
): HttpClient {
  return {
    get: vi.fn().mockResolvedValue(MOCK_NOTE),
    post: vi.fn(),
    patch: vi.fn(),
    ...overrides,
  } as unknown as HttpClient;
}

function renderPage(client: HttpClient, noteId = 'note-1') {
  return render(
    <MemoryRouter initialEntries={[`/notes/${noteId}`]}>
      <QueryClientProvider client={createTestQueryClient()}>
        <HttpClientProvider client={client}>
          <Routes>
            <Route path="/notes/:id" element={<NoteDetailPage />} />
          </Routes>
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('NoteDetailPage', () => {
  it('로딩 중에 Loading 텍스트를 보여준다', () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(client);

    expect(screen.getByRole('link', { name: 'Back to notes' })).toBeDefined();
    expect(screen.getByText('Loading')).toBeDefined();
  });

  it('note 제목과 alias, 갱신 일자를 렌더링한다', async () => {
    renderPage(buildMockHttpClient());

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: '테스트 노트' }),
      ).toBeDefined();
    });
    expect(screen.getByText('Test Note')).toBeDefined();
    expect(screen.getByText('Jan 5, 2026')).toBeDefined();
  });

  it('본문 heading에 outline과 같은 anchor id를 붙인다', async () => {
    renderPage(buildMockHttpClient());

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Layers' })).toBeDefined();
    });
    expect(screen.getByRole('heading', { name: 'Layers' }).id).toBe('layers');
    expect(screen.getByRole('heading', { name: 'Segments' }).id).toBe(
      'segments',
    );
  });

  it('heading이 둘 이상이면 outline navigation을 보여준다', async () => {
    renderPage(buildMockHttpClient());

    const outline = await screen.findByRole('navigation', {
      name: 'On this page',
    });

    expect(
      within(outline)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['#layers', '#segments']);
  });

  it('heading이 없으면 outline navigation을 보여주지 않는다', async () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockResolvedValue({ ...MOCK_NOTE, body: '제목 없는 본문' }),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByText('제목 없는 본문')).toBeDefined();
    });
    expect(
      screen.queryByRole('navigation', { name: 'On this page' }),
    ).toBeNull();
  });

  it('resolve되지 않은 wiki link를 label만 남겨 렌더링한다', async () => {
    renderPage(buildMockHttpClient());

    const link = await screen.findByTitle('FSD — no note yet');

    expect(link.textContent).toBe('FSD');
  });

  it('keyword를 topics 메타 라인으로 보여준다', async () => {
    renderPage(buildMockHttpClient());

    await waitFor(() => {
      expect(screen.getByText('architecture')).toBeDefined();
    });
    expect(screen.getByText('fsd')).toBeDefined();
  });

  it('에러가 발생하면 에러 메시지를 보여준다', async () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockRejectedValue(new Error('Note not found')),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
    expect(screen.getByText('Error: Note not found')).toBeDefined();
  });

  it('getNote를 올바른 id로 호출한다', async () => {
    const getNote = vi.fn().mockResolvedValue(MOCK_NOTE);

    renderPage(buildMockHttpClient({ get: getNote }), 'note-42');

    await waitFor(() => {
      expect(getNote).toHaveBeenCalledWith('/notes/note-42');
    });
  });

  it('Back to notes 링크가 /notes로 연결된다', () => {
    renderPage(buildMockHttpClient());

    const link = screen.getByRole('link', { name: 'Back to notes' });

    expect((link as HTMLAnchorElement).href).toContain('/notes');
  });
});
