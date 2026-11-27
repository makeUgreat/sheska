import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type AnswerEvent, type GetPostResponse } from '@/entities/post';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';
import { PostDetailPage } from './post-detail-page';

type MockHttpClientOverrides = {
  get?: ReturnType<typeof fn>;
  post?: ReturnType<typeof fn>;
  patch?: ReturnType<typeof fn>;
  postStream?: ReturnType<typeof fn>;
};

const NOW = '2026-01-05T12:00:00.000Z';
const MOCK_POST: GetPostResponse = {
  postId: 'post-1',
  sourceId: 'source-1',
  title: '테스트 포스트',
  viewCount: 7,
  summary: { status: 'pending' },
  series: null,
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

function buildMockHttpClient(overrides: MockHttpClientOverrides = {}) {
  const spies = {
    get: fn(() => Promise.resolve(MOCK_POST)),
    post: fn(() => Promise.resolve(undefined)),
    patch: fn(),
    postStream: fn(),
    ...overrides,
  };
  return { ...spies, client: spies as unknown as HttpClient };
}

function withPage(client: HttpClient, { path = '/posts/post-1', route = '/posts/:id' } = {}): Decorator {
  return (Story) => (
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <HttpClientProvider client={client}>
          <Routes>
            <Route path={route} element={<Story />} />
          </Routes>
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

async function* answerOf(events: AnswerEvent[]) {
  for (const event of events) yield await Promise.resolve(event);
}

/** 첫 줄을 받기 전에 실패하는 stream이다. */
async function* failingWith(error: Error): AsyncGenerator<AnswerEvent> {
  yield* await Promise.reject<AnswerEvent[]>(error);
}

const meta = {
  title: 'Pages/PostDetail/PostDetailPage',
  component: PostDetailPage,
  parameters: { layout: 'fullscreen' },
  beforeEach: () => window.localStorage.clear(),
} satisfies Meta<typeof PostDetailPage>;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

const ASK_LABEL = '이 글에 대해 질문하기';

/** 접힌 질문하기를 눌러 펼친 뒤 묻는다. 이미 펼쳐 있으면 바로 묻는다. */
async function askQuestion({ canvas, userEvent }: PlayContext, question: string) {
  if (!canvas.queryByRole('textbox', { name: ASK_LABEL })) {
    await userEvent.click(await canvas.findByRole('button', { name: '질문하기' }));
  }
  await userEvent.type(await canvas.findByRole('textbox', { name: ASK_LABEL }), `${question}{Enter}`);
}

function askRegion({ canvas }: PlayContext) {
  return canvas.getByRole('region', { name: 'Ask about this post' });
}

export const Loading: Story = {
  name: '로딩 중에는 돌아가는 링크만 그리고 빈 상태나 오류를 그리지 않는다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient({ get: fn(() => new Promise(() => {})) }).client)],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Back to posts' })).toBeDefined();
    await expect(canvas.queryByText('Not found')).toBeNull();
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};

export const TitleDateAndViews: Story = {
  name: 'post 제목과 갱신 일자, 조회수를 렌더링한다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('heading', { level: 1, name: '테스트 포스트' })).toBeDefined());

    await expect(canvas.getAllByText('2026.01.05')).toHaveLength(2);
    await expect(canvas.getByText((_, element) => element?.tagName === 'SPAN' && element.textContent === '7 views')).toBeDefined();
  },
};

export const SummaryPending: Story = {
  name: 'AI 요약 자리에 요약을 작성 중이라고 알린다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async ({ canvas }) => {
    const summary = await canvas.findByRole('region', { name: 'AI summary' });

    await expect(within(summary).getByText('요약 작성 중')).toBeDefined();
  },
};

const SUMMARY_LINES = ['첫 문장이다.', '둘째 문장이다.', '셋째 문장이다.', '넷째 문장이다.'];

export const SummaryReady: Story = {
  name: '요약이 있으면 요약 자리에 받은 줄을 모두 보여준다',
  tags: ['!dev'],
  decorators: [
    withPage(
      buildMockHttpClient({ get: fn(() => Promise.resolve({ ...MOCK_POST, summary: { status: 'ready', lines: SUMMARY_LINES } })) }).client,
    ),
  ],
  play: async ({ canvas }) => {
    const summary = await canvas.findByRole('region', { name: 'AI summary' });

    for (const line of SUMMARY_LINES) {
      await expect(within(summary).getByText(line)).toBeDefined();
    }
  },
};

export const SummaryFailed: Story = {
  name: '요약을 만들지 못했으면 요약 자리를 남기고 실패를 알린다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient({ get: fn(() => Promise.resolve({ ...MOCK_POST, summary: { status: 'failed' } })) }).client)],
  play: async ({ canvas }) => {
    const summary = await canvas.findByRole('region', { name: 'AI summary' });

    await expect(within(summary).getByText('요약을 만들지 못했어요')).toBeDefined();
  },
};

/** 호출 기록은 story마다 지워지므로 몇 번째 호출인지로 stream을 고른다. */
function streamsInTurn(...streams: Array<() => AsyncGenerator<AnswerEvent>>) {
  const postStream: ReturnType<typeof fn> = fn(() => streams[postStream.mock.calls.length - 1]());
  return postStream;
}

const answerWithSourceHttp = buildMockHttpClient({
  postStream: fn(() =>
    answerOf([
      { type: 'delta', text: '페이지는 ' },
      { type: 'delta', text: 'widget을 조합합니다.' },
      { type: 'done', sources: ['Layers'] },
    ]),
  ),
});

export const AskStreamsAnswer: Story = {
  name: '질문을 보내면 이어 받은 답과 근거 heading 링크를 보여준다',
  tags: ['!dev'],
  decorators: [withPage(answerWithSourceHttp.client)],
  play: async (context) => {
    await askQuestion(context, '페이지는 무엇을 하나요?');

    await expect(await within(askRegion(context)).findByText('페이지는 widget을 조합합니다.')).toBeDefined();
    await expect(within(askRegion(context)).getByRole('link', { name: 'Layers' }).getAttribute('href')).toBe('#layers');
    await expect(answerWithSourceHttp.postStream).toHaveBeenCalledWith(
      '/posts/post-1/questions',
      { question: '페이지는 무엇을 하나요?', history: [] },
      expect.anything(),
      expect.any(AbortSignal),
    );
  },
};

export const AskOpens: Story = {
  name: '질문하기를 누르면 입력 칸과 빈 대화 안내를 펼친다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas, userEvent } = context;

    await userEvent.click(await canvas.findByRole('button', { name: '질문하기' }));

    await expect(canvas.getByRole('textbox', { name: ASK_LABEL })).toBeDefined();
    await expect(within(askRegion(context)).getByText('이 글을 바탕으로 답해 드려요.')).toBeDefined();
  },
};

export const AskCollapsesOnOutsideClick: Story = {
  name: '대화 카드 밖을 누르면 질문하기로 접고, 다시 펼치면 대화가 남아 있다',
  tags: ['!dev'],
  decorators: [
    withPage(
      buildMockHttpClient({
        postStream: fn(() =>
          answerOf([
            { type: 'delta', text: '남길 답' },
            { type: 'done', sources: [] },
          ]),
        ),
      }).client,
    ),
  ],
  play: async (context) => {
    const { canvas, userEvent } = context;

    await askQuestion(context, '질문');
    await within(askRegion(context)).findByText('남길 답');
    await userEvent.click(canvas.getByRole('heading', { level: 1, name: '테스트 포스트' }));

    await userEvent.click(await canvas.findByRole('button', { name: '질문하기' }));
    await expect(await within(askRegion(context)).findByText('남길 답')).toBeDefined();
  },
};

export const AskMinimizes: Story = {
  name: '오른쪽 아래로 접으면 작은 버튼만 남고, 그 버튼을 누르면 다시 펼친다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: '오른쪽 아래로 접기' }));
    await userEvent.click(await canvas.findByRole('button', { name: '질문 열기, 질문 0개' }));

    await expect(await canvas.findByRole('textbox', { name: ASK_LABEL })).toBeDefined();
    await expect(canvas.queryByRole('button', { name: '질문하기' })).toBeNull();
  },
};

export const AskSourcePinsSection: Story = {
  name: '근거 링크를 누르면 그 절의 섹션 강조를 고정한다',
  tags: ['!dev'],
  decorators: [
    withPage(
      buildMockHttpClient({
        postStream: fn(() =>
          answerOf([
            { type: 'delta', text: '근거가 있는 답' },
            { type: 'done', sources: ['Segments'] },
          ]),
        ),
      }).client,
    ),
  ],
  play: async (context) => {
    const { canvas, userEvent } = context;

    await askQuestion(context, '질문');
    await userEvent.click(await within(askRegion(context)).findByRole('link', { name: 'Segments' }));

    await expect(canvas.getByRole('heading', { name: 'Segments' }).closest('section')?.hasAttribute('data-focus')).toBe(true);
  },
};

let finishAnswer: () => void = () => undefined;

export const AskLocksWhileStreaming: Story = {
  name: '답을 받는 동안 입력 칸을 잠그고, 답이 끝나면 다시 연다',
  tags: ['!dev'],
  decorators: [
    withPage(
      buildMockHttpClient({
        postStream: fn(async function* () {
          const gate = new Promise<void>((resolve) => (finishAnswer = resolve));
          yield { type: 'delta', text: '답하는 중' };
          await gate;
          yield { type: 'done', sources: [] };
        }),
      }).client,
    ),
  ],
  play: async (context) => {
    const { canvas } = context;

    await askQuestion(context, '질문');

    await expect(await within(askRegion(context)).findByText('답하는 중')).toBeDefined();
    await expect(canvas.getByRole('textbox', { name: ASK_LABEL })).toHaveProperty('disabled', true);

    finishAnswer();

    await waitFor(() => expect(canvas.getByRole('textbox', { name: ASK_LABEL })).toHaveProperty('disabled', false));
  },
};

const twoAnswersHttp = buildMockHttpClient({
  postStream: streamsInTurn(
    () =>
      answerOf([
        { type: 'delta', text: '첫 답' },
        { type: 'done', sources: [] },
      ]),
    () => answerOf([{ type: 'done', sources: [] }]),
  ),
});

export const AskSendsHistory: Story = {
  name: '앞서 끝난 질문과 답을 history로 함께 보낸다',
  tags: ['!dev'],
  decorators: [withPage(twoAnswersHttp.client)],
  play: async (context) => {
    const { postStream } = twoAnswersHttp;

    await askQuestion(context, '첫 질문');
    await within(askRegion(context)).findByText('첫 답');
    await askQuestion(context, '둘째 질문');

    await waitFor(() => expect(postStream).toHaveBeenCalledTimes(2));
    await expect(postStream.mock.calls[1][1]).toEqual({ question: '둘째 질문', history: [{ question: '첫 질문', answer: '첫 답' }] });
  },
};

export const AskRetriesUnreachable: Story = {
  name: '서버에 닿지 못하면 실패를 알리고, Retry하면 같은 자리에서 다시 답한다',
  tags: ['!dev'],
  decorators: [
    withPage(
      buildMockHttpClient({
        postStream: streamsInTurn(
          () => failingWith(new TypeError('Failed to fetch')),
          () =>
            answerOf([
              { type: 'delta', text: '다시 받은 답' },
              { type: 'done', sources: [] },
            ]),
        ),
      }).client,
    ),
  ],
  play: async (context) => {
    const { userEvent } = context;

    await askQuestion(context, '질문');
    await expect(await within(askRegion(context)).findByText('The server could not be reached.')).toBeDefined();

    await userEvent.click(within(askRegion(context)).getByRole('button', { name: /Retry/ }));
    await expect(await within(askRegion(context)).findByText('다시 받은 답')).toBeDefined();
    await expect(within(askRegion(context)).queryByRole('alert')).toBeNull();
    await expect(within(askRegion(context)).getAllByText('질문')).toHaveLength(1);
  },
};

export const AskKeepsPartialAnswer: Story = {
  name: '답이 중간에 끊기면 받은 답을 남기고 끊겼다고 알린다',
  tags: ['!dev'],
  decorators: [
    withPage(
      buildMockHttpClient({
        postStream: fn(() =>
          answerOf([
            { type: 'delta', text: '받은 데까지의 답' },
            { type: 'error', code: 'internal.unavailable', message: 'LLM is unavailable' },
          ]),
        ),
      }).client,
    ),
  ],
  play: async (context) => {
    await askQuestion(context, '질문');

    await expect(await within(askRegion(context)).findByText('The answer stopped partway.')).toBeDefined();
    await expect(within(askRegion(context)).getByText('받은 데까지의 답')).toBeDefined();
  },
};

export const AskRateLimited: Story = {
  name: '질문을 너무 자주 보내면 남은 시간을 알리며 질문 줄을 잠근다',
  tags: ['!dev'],
  decorators: [
    withPage(
      buildMockHttpClient({
        postStream: fn(() =>
          failingWith(
            new HttpError(429, 'Too Many Requests', {
              code: 'post.question_rate_limited',
              details: { retryAfterSeconds: 42 },
            }),
          ),
        ),
      }).client,
    ),
  ],
  play: async (context) => {
    const { canvas } = context;

    await askQuestion(context, '질문');

    await expect(await within(askRegion(context)).findByText('Too many questions. Try again in a moment.')).toBeDefined();
    await expect(within(askRegion(context)).queryByRole('button', { name: /Retry/ })).toBeNull();
    await expect(within(askRegion(context)).getByText('You can ask again in 0:42')).toBeDefined();
    await expect(canvas.getByRole('textbox', { name: ASK_LABEL })).toHaveProperty('disabled', true);
  },
};

export const AskClears: Story = {
  name: '지우개를 누르면 대화를 지우고 빈 대화 안내를 다시 보여준다',
  tags: ['!dev'],
  decorators: [
    withPage(
      buildMockHttpClient({
        postStream: fn(() =>
          answerOf([
            { type: 'delta', text: '지울 답' },
            { type: 'done', sources: [] },
          ]),
        ),
      }).client,
    ),
  ],
  play: async (context) => {
    const { userEvent } = context;

    await askQuestion(context, '질문');
    await within(askRegion(context)).findByText('지울 답');
    await userEvent.click(within(askRegion(context)).getByRole('button', { name: '대화 지우기' }));

    await expect(within(askRegion(context)).queryByText('지울 답')).toBeNull();
    await expect(within(askRegion(context)).getByText('이 글을 바탕으로 답해 드려요.')).toBeDefined();
  },
};

export const HeadingAnchors: Story = {
  name: '본문 heading에 outline과 같은 anchor id를 붙인다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('heading', { name: 'Layers' })).toBeDefined());

    await expect(canvas.getByRole('heading', { name: 'Layers' }).id).toBe('layers');
    await expect(canvas.getByRole('heading', { name: 'Segments' }).id).toBe('segments');
  },
};

export const UnresolvedWikiLink: Story = {
  name: 'resolve되지 않은 wiki link를 label만 남겨 렌더링한다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async ({ canvas }) => {
    const link = await canvas.findByTitle('FSD — no note yet');

    await expect(link.textContent).toBe('FSD');
  },
};

function respondToSession(authenticated: boolean) {
  return fn((path: string) => Promise.resolve(path === '/auth/session' ? { authenticated } : MOCK_POST));
}

export const OwnerViewHistoryLink: Story = {
  name: '소유자에게는 조회수가 조회내역으로 가는 링크다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient({ get: respondToSession(true) }).client)],
  play: async ({ canvas }) => {
    const link = await canvas.findByRole('link', { name: '7 views, open view history' });

    await expect(link.getAttribute('href')).toBe('/posts/post-1/views');
  },
};

export const GuestViewCount: Story = {
  name: '방문자에게는 조회수가 링크가 아니다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient({ get: respondToSession(false) }).client)],
  play: async ({ canvas }) => {
    await canvas.findByRole('heading', { level: 1, name: '테스트 포스트' });

    await expect(canvas.queryByRole('link', { name: /views/ })).toBeNull();
  },
};

const recordViewHttp = buildMockHttpClient({ post: fn(() => Promise.resolve(undefined)) });

export const RecordsView: Story = {
  name: 'post를 받으면 조회를 한 번 기록한다',
  tags: ['!dev'],
  decorators: [withPage(recordViewHttp.client)],
  play: async () => {
    const { post: recordView } = recordViewHttp;

    await waitFor(() => expect(recordView).toHaveBeenCalledWith('/posts/post-1/views', {}));
    await expect(recordView).toHaveBeenCalledOnce();
  },
};

const missingPostHttp = buildMockHttpClient({
  get: fn(() => Promise.reject(new HttpError(404, 'Not Found'))),
  post: fn(() => Promise.resolve(undefined)),
});

export const SkipsViewOnFailure: Story = {
  name: 'post를 받지 못하면 조회를 기록하지 않는다',
  tags: ['!dev'],
  decorators: [withPage(missingPostHttp.client)],
  play: async ({ canvas }) => {
    const { post: recordView } = missingPostHttp;

    await waitFor(() => expect(canvas.getByRole('alert')).toBeDefined());

    await expect(recordView).not.toHaveBeenCalled();
  },
};

export const LoadError: Story = {
  name: '에러가 발생하면 상태 코드와 실패한 대상을 보여준다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient({ get: fn(() => Promise.reject(new HttpError(503, 'Service Unavailable'))) }).client)],
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('alert')).toBeDefined());

    await expect(canvas.getByText('503')).toBeDefined();
    await expect(canvas.getByText('Something went wrong while loading.')).toBeDefined();
  },
};

const pendingGetHttp = buildMockHttpClient({ get: fn(() => new Promise(() => {})) });

export const MissingId: Story = {
  name: 'post id가 없으면 빈 상태 메시지를 보여준다',
  tags: ['!dev'],
  decorators: [withPage(pendingGetHttp.client, { path: '/posts', route: '/posts' })],
  play: async ({ canvas }) => {
    const { get } = pendingGetHttp;

    await expect(canvas.getByText('This page does not exist, or it was removed.')).toBeDefined();
    await expect(get).not.toHaveBeenCalledWith(expect.stringMatching(/^\/posts\//), expect.anything());
  },
};

const getPostHttp = buildMockHttpClient({ get: fn(() => Promise.resolve(MOCK_POST)) });

export const GetsPostById: Story = {
  name: 'getPost를 올바른 id로 호출한다',
  tags: ['!dev'],
  decorators: [withPage(getPostHttp.client, { path: '/posts/post-42' })],
  play: async () => {
    const { get: getPost } = getPostHttp;

    await waitFor(() => expect(getPost).toHaveBeenCalledWith('/posts/post-42', expect.anything()));
  },
};

export const BackLink: Story = {
  name: 'Back to posts 링크가 /posts로 연결된다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Back to posts' });

    await expect((link as HTMLAnchorElement).href).toContain('/posts');
  },
};
