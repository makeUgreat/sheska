import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type AnswerEvent, type GetPostResponse } from '@/entities/post';
import { PostDetailPage } from '@/pages/post-detail';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';

type MockHttpClientOverrides = {
  get?: ReturnType<typeof vi.fn>;
  post?: ReturnType<typeof vi.fn>;
  patch?: ReturnType<typeof vi.fn>;
  postStream?: ReturnType<typeof vi.fn>;
};

function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const NOW = '2026-01-05T12:00:00.000Z';
const MOCK_POST: GetPostResponse = {
  postId: 'post-1',
  sourceId: 'source-1',
  title: '테스트 포스트',
  viewCount: 7,
  summary: { status: 'pending' },
  createdAt: NOW,
  updatedAt: NOW,
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
};

function buildMockHttpClient(overrides: MockHttpClientOverrides = {}): HttpClient {
  return {
    get: vi.fn().mockResolvedValue(MOCK_POST),
    post: vi.fn().mockResolvedValue(undefined),
    patch: vi.fn(),
    postStream: vi.fn(),
    ...overrides,
  } as unknown as HttpClient;
}

function renderPage(client: HttpClient, postId = 'post-1') {
  return render(
    <MemoryRouter initialEntries={[`/posts/${postId}`]}>
      <QueryClientProvider client={createTestQueryClient()}>
        <HttpClientProvider client={client}>
          <Routes>
            <Route path="/posts/:id" element={<PostDetailPage />} />
          </Routes>
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

async function* answerOf(events: AnswerEvent[]) {
  for (const event of events) yield await Promise.resolve(event);
}

/** 첫 줄을 받기 전에 실패하는 stream이다. */
async function* failingWith(error: Error): AsyncGenerator<AnswerEvent> {
  yield* await Promise.reject<AnswerEvent[]>(error);
}

const ASK_LABEL = '이 글에 대해 질문하기';

/** 접힌 질문하기를 눌러 펼친 뒤 묻는다. 이미 펼쳐 있으면 바로 묻는다. */
async function askQuestion(question: string) {
  const user = userEvent.setup();
  if (!screen.queryByRole('textbox', { name: ASK_LABEL })) {
    await user.click(await screen.findByRole('button', { name: '질문하기' }));
  }
  await user.type(await screen.findByRole('textbox', { name: ASK_LABEL }), `${question}{Enter}`);
  return user;
}

function askRegion() {
  return screen.getByRole('region', { name: 'Ask about this post' });
}

function renderPageWithoutId(client: HttpClient) {
  return render(
    <MemoryRouter initialEntries={['/posts']}>
      <QueryClientProvider client={createTestQueryClient()}>
        <HttpClientProvider client={client}>
          <Routes>
            <Route path="/posts" element={<PostDetailPage />} />
          </Routes>
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('PostDetailPage', () => {
  afterEach(() => window.localStorage.clear());

  it('로딩 중에는 돌아가는 링크만 그리고 빈 상태나 오류를 그리지 않는다', () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderPage(client);

    expect(screen.getByRole('link', { name: 'Back to posts' })).toBeDefined();
    expect(screen.queryByText('Not found')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('post 제목과 갱신 일자, 조회수를 렌더링한다', async () => {
    renderPage(buildMockHttpClient());

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: '테스트 포스트' })).toBeDefined();
    });
    expect(screen.getAllByText('2026.01.05')).toHaveLength(2);
    expect(screen.getByText((_, element) => element?.tagName === 'SPAN' && element.textContent === '7 views')).toBeDefined();
  });

  it('AI 요약 자리에 요약이 준비되지 않았다고 알린다', async () => {
    renderPage(buildMockHttpClient());

    const summary = await screen.findByRole('region', { name: 'AI summary' });
    expect(within(summary).getByText('Summary not ready yet')).toBeDefined();
  });

  it('요약이 있으면 요약 자리에 받은 줄을 모두 보여준다', async () => {
    const lines = ['첫 문장이다.', '둘째 문장이다.', '셋째 문장이다.', '넷째 문장이다.'];
    const client = buildMockHttpClient({
      get: vi.fn().mockResolvedValue({ ...MOCK_POST, summary: { status: 'ready', lines } }),
    });

    renderPage(client);

    const summary = await screen.findByRole('region', { name: 'AI summary' });
    lines.forEach((line) => expect(within(summary).getByText(line)).toBeDefined());
  });

  it('요약을 만들지 못했으면 요약 자리를 남기고 실패를 알린다', async () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockResolvedValue({ ...MOCK_POST, summary: { status: 'failed' } }),
    });

    renderPage(client);

    const summary = await screen.findByRole('region', { name: 'AI summary' });
    expect(within(summary).getByText('Summary could not be generated.')).toBeDefined();
  });

  describe('이 글에 묻기', () => {
    it('질문을 보내면 이어 받은 답과 근거 heading 링크를 보여준다', async () => {
      const postStream = vi.fn().mockImplementation(() =>
        answerOf([
          { type: 'delta', text: '페이지는 ' },
          { type: 'delta', text: 'widget을 조합합니다.' },
          { type: 'done', sources: ['Layers'] },
        ]),
      );
      renderPage(buildMockHttpClient({ postStream }));

      await askQuestion('페이지는 무엇을 하나요?');

      expect(await within(askRegion()).findByText('페이지는 widget을 조합합니다.')).toBeDefined();
      expect(within(askRegion()).getByRole('link', { name: 'Layers' }).getAttribute('href')).toBe('#layers');
      expect(postStream).toHaveBeenCalledWith(
        '/posts/post-1/questions',
        { question: '페이지는 무엇을 하나요?', history: [] },
        expect.anything(),
        expect.any(AbortSignal),
      );
    });

    it('질문하기를 누르면 입력 칸과 빈 대화 안내를 펼친다', async () => {
      renderPage(buildMockHttpClient());
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: '질문하기' }));

      expect(screen.getByRole('textbox', { name: ASK_LABEL })).toBeDefined();
      expect(within(askRegion()).getByText('이 글을 바탕으로 답해 드려요.')).toBeDefined();
    });

    it('대화 카드 밖을 누르면 질문하기로 접고, 다시 펼치면 대화가 남아 있다', async () => {
      const postStream = vi.fn().mockImplementation(() =>
        answerOf([
          { type: 'delta', text: '남길 답' },
          { type: 'done', sources: [] },
        ]),
      );
      renderPage(buildMockHttpClient({ postStream }));

      const user = await askQuestion('질문');
      await within(askRegion()).findByText('남길 답');
      await user.click(screen.getByRole('heading', { level: 1, name: '테스트 포스트' }));

      await user.click(await screen.findByRole('button', { name: '질문하기' }));
      expect(await within(askRegion()).findByText('남길 답')).toBeDefined();
    });

    it('오른쪽 아래로 접으면 작은 버튼만 남고, 그 버튼을 누르면 다시 펼친다', async () => {
      renderPage(buildMockHttpClient());
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: '오른쪽 아래로 접기' }));
      await user.click(await screen.findByRole('button', { name: '질문 열기, 질문 0개' }));

      expect(await screen.findByRole('textbox', { name: ASK_LABEL })).toBeDefined();
      expect(screen.queryByRole('button', { name: '질문하기' })).toBeNull();
    });

    it('근거 링크를 누르면 그 절의 섹션 강조를 고정한다', async () => {
      const postStream = vi.fn().mockImplementation(() =>
        answerOf([
          { type: 'delta', text: '근거가 있는 답' },
          { type: 'done', sources: ['Segments'] },
        ]),
      );
      renderPage(buildMockHttpClient({ postStream }));

      const user = await askQuestion('질문');
      await user.click(await within(askRegion()).findByRole('link', { name: 'Segments' }));

      expect(screen.getByRole('heading', { name: 'Segments' }).closest('section')?.hasAttribute('data-focus')).toBe(true);
    });

    it('답을 받는 동안 입력 칸을 잠그고, 답이 끝나면 다시 연다', async () => {
      let finish!: () => void;
      const gate = new Promise<void>((resolve) => (finish = resolve));
      const postStream = vi.fn().mockImplementation(async function* () {
        yield { type: 'delta', text: '답하는 중' };
        await gate;
        yield { type: 'done', sources: [] };
      });
      renderPage(buildMockHttpClient({ postStream }));

      await askQuestion('질문');

      expect(await within(askRegion()).findByText('답하는 중')).toBeDefined();
      expect(screen.getByRole('textbox', { name: ASK_LABEL })).toHaveProperty('disabled', true);

      finish();

      await waitFor(() => expect(screen.getByRole('textbox', { name: ASK_LABEL })).toHaveProperty('disabled', false));
    });

    it('앞서 끝난 질문과 답을 history로 함께 보낸다', async () => {
      const postStream = vi
        .fn()
        .mockImplementationOnce(() =>
          answerOf([
            { type: 'delta', text: '첫 답' },
            { type: 'done', sources: [] },
          ]),
        )
        .mockImplementationOnce(() => answerOf([{ type: 'done', sources: [] }]));
      renderPage(buildMockHttpClient({ postStream }));

      await askQuestion('첫 질문');
      await within(askRegion()).findByText('첫 답');
      await askQuestion('둘째 질문');

      await waitFor(() => expect(postStream).toHaveBeenCalledTimes(2));
      expect(postStream.mock.calls[1][1]).toEqual({ question: '둘째 질문', history: [{ question: '첫 질문', answer: '첫 답' }] });
    });

    it('서버에 닿지 못하면 실패를 알리고, Retry하면 같은 자리에서 다시 답한다', async () => {
      const postStream = vi
        .fn()
        .mockImplementationOnce(() => failingWith(new TypeError('Failed to fetch')))
        .mockImplementationOnce(() =>
          answerOf([
            { type: 'delta', text: '다시 받은 답' },
            { type: 'done', sources: [] },
          ]),
        );
      renderPage(buildMockHttpClient({ postStream }));

      const user = await askQuestion('질문');
      expect(await within(askRegion()).findByText('The server could not be reached.')).toBeDefined();

      await user.click(within(askRegion()).getByRole('button', { name: /Retry/ }));
      expect(await within(askRegion()).findByText('다시 받은 답')).toBeDefined();
      expect(within(askRegion()).queryByRole('alert')).toBeNull();
      expect(within(askRegion()).getAllByText('질문')).toHaveLength(1);
    });

    it('답이 중간에 끊기면 받은 답을 남기고 끊겼다고 알린다', async () => {
      const postStream = vi.fn().mockImplementation(() =>
        answerOf([
          { type: 'delta', text: '받은 데까지의 답' },
          { type: 'error', code: 'internal.unavailable', message: 'LLM is unavailable' },
        ]),
      );
      renderPage(buildMockHttpClient({ postStream }));

      await askQuestion('질문');

      expect(await within(askRegion()).findByText('The answer stopped partway.')).toBeDefined();
      expect(within(askRegion()).getByText('받은 데까지의 답')).toBeDefined();
    });

    it('질문을 너무 자주 보내면 남은 시간을 알리며 질문 줄을 잠근다', async () => {
      const postStream = vi.fn().mockImplementation(() =>
        failingWith(
          new HttpError(429, 'Too Many Requests', {
            code: 'post.question_rate_limited',
            details: { retryAfterSeconds: 42 },
          }),
        ),
      );
      renderPage(buildMockHttpClient({ postStream }));

      await askQuestion('질문');

      expect(await within(askRegion()).findByText('Too many questions. Try again in a moment.')).toBeDefined();
      expect(within(askRegion()).queryByRole('button', { name: /Retry/ })).toBeNull();
      expect(within(askRegion()).getByText('You can ask again in 0:42')).toBeDefined();
      expect(screen.getByRole('textbox', { name: ASK_LABEL })).toHaveProperty('disabled', true);
    });

    it('지우개를 누르면 대화를 지우고 빈 대화 안내를 다시 보여준다', async () => {
      const postStream = vi.fn().mockImplementation(() =>
        answerOf([
          { type: 'delta', text: '지울 답' },
          { type: 'done', sources: [] },
        ]),
      );
      renderPage(buildMockHttpClient({ postStream }));

      const user = await askQuestion('질문');
      await within(askRegion()).findByText('지울 답');
      await user.click(within(askRegion()).getByRole('button', { name: '대화 지우기' }));

      expect(within(askRegion()).queryByText('지울 답')).toBeNull();
      expect(within(askRegion()).getByText('이 글을 바탕으로 답해 드려요.')).toBeDefined();
    });
  });

  it('본문 heading에 outline과 같은 anchor id를 붙인다', async () => {
    renderPage(buildMockHttpClient());

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Layers' })).toBeDefined();
    });
    expect(screen.getByRole('heading', { name: 'Layers' }).id).toBe('layers');
    expect(screen.getByRole('heading', { name: 'Segments' }).id).toBe('segments');
  });

  it('resolve되지 않은 wiki link를 label만 남겨 렌더링한다', async () => {
    renderPage(buildMockHttpClient());

    const link = await screen.findByTitle('FSD — no note yet');

    expect(link.textContent).toBe('FSD');
  });

  it('소유자에게는 조회수가 조회내역으로 가는 링크다', async () => {
    const get = vi.fn((path: string) => Promise.resolve(path === '/auth/session' ? { authenticated: true } : MOCK_POST));

    renderPage(buildMockHttpClient({ get }));

    const link = await screen.findByRole('link', { name: '7 views, open view history' });
    expect(link.getAttribute('href')).toBe('/posts/post-1/views');
  });

  it('방문자에게는 조회수가 링크가 아니다', async () => {
    const get = vi.fn((path: string) => Promise.resolve(path === '/auth/session' ? { authenticated: false } : MOCK_POST));

    renderPage(buildMockHttpClient({ get }));

    await screen.findByRole('heading', { level: 1, name: '테스트 포스트' });
    expect(screen.queryByRole('link', { name: /views/ })).toBeNull();
  });

  it('post를 받으면 조회를 한 번 기록한다', async () => {
    const recordView = vi.fn().mockResolvedValue(undefined);

    renderPage(buildMockHttpClient({ post: recordView }));

    await waitFor(() => {
      expect(recordView).toHaveBeenCalledWith('/posts/post-1/views', {});
    });
    expect(recordView).toHaveBeenCalledOnce();
  });

  it('post를 받지 못하면 조회를 기록하지 않는다', async () => {
    const recordView = vi.fn().mockResolvedValue(undefined);

    renderPage(buildMockHttpClient({ get: vi.fn().mockRejectedValue(new HttpError(404, 'Not Found')), post: recordView }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
    expect(recordView).not.toHaveBeenCalled();
  });

  it('에러가 발생하면 상태 코드와 실패한 대상을 보여준다', async () => {
    const client = buildMockHttpClient({
      get: vi.fn().mockRejectedValue(new HttpError(503, 'Service Unavailable')),
    });

    renderPage(client);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
    expect(screen.getByText('503')).toBeDefined();
    expect(screen.getByText('Something went wrong while loading.')).toBeDefined();
  });

  it('post id가 없으면 빈 상태 메시지를 보여준다', () => {
    const get = vi.fn().mockReturnValue(new Promise(() => {}));

    renderPageWithoutId(buildMockHttpClient({ get }));

    expect(screen.getByText('This page does not exist, or it was removed.')).toBeDefined();
    expect(get).not.toHaveBeenCalledWith(expect.stringMatching(/^\/posts\//), expect.anything());
  });

  it('getPost를 올바른 id로 호출한다', async () => {
    const getPost = vi.fn().mockResolvedValue(MOCK_POST);

    renderPage(buildMockHttpClient({ get: getPost }), 'post-42');

    await waitFor(() => {
      expect(getPost).toHaveBeenCalledWith('/posts/post-42', expect.anything());
    });
  });

  it('Back to posts 링크가 /posts로 연결된다', () => {
    renderPage(buildMockHttpClient());

    const link = screen.getByRole('link', { name: 'Back to posts' });

    expect((link as HTMLAnchorElement).href).toContain('/posts');
  });
});
