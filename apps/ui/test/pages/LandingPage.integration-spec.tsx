import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from '@/pages/landing';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';

const NOW = '2026-11-18T00:00:00.000Z';

const POST = {
  postId: 'post-1',
  sourceId: 'post-1',
  title: 'Redis에 로그인 세션 저장하기',
  viewCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
};

const SOURCE = {
  sourceId: 'source-1',
  externalSourceId: 'Notes/draft.md',
  title: 'CLI 설계 메모',
  fingerprint: 'fingerprint-1',
  sizeBytes: 10,
  createdAt: NOW,
  updatedAt: NOW,
  latestSyncJob: null,
  publishedPostId: null,
};

const API_TOKEN = {
  apiTokenId: 'token-1',
  name: 'macbook',
  hint: 'shk_Ab3d',
  createdAt: NOW,
  lastUsedAt: null,
};

const ISSUED_TOKEN = {
  ...API_TOKEN,
  apiTokenId: 'token-2',
  name: 'desktop',
  hint: 'shk_Zx9q',
  token: 'shk_Zx9qSECRET',
};

function buildMockHttpClient({
  authenticated = false,
  post = vi.fn().mockResolvedValue(undefined),
  del = vi.fn().mockResolvedValue(undefined),
}: {
  authenticated?: boolean;
  post?: ReturnType<typeof vi.fn>;
  del?: ReturnType<typeof vi.fn>;
} = {}) {
  const get = vi.fn((path: string, _schema: unknown, params?: Record<string, string>) => {
    switch (path) {
      case '/auth/session':
        return Promise.resolve({ authenticated });
      case '/posts':
        return Promise.resolve({ posts: [POST], nextCursor: null });
      case '/posts/count':
        return Promise.resolve({ count: 12 });
      case '/posts/search':
        return Promise.resolve({
          posts:
            params?.q === 'redis'
              ? [
                  {
                    ...POST,
                    matchReason: 'both',
                    similarity: 92,
                    snippet: '세션 토큰은 Redis에\n저장한다',
                  },
                ]
              : [],
          nextCursor: null,
          semanticSearchApplied: true,
        });
      case '/api-tokens':
        return Promise.resolve({
          apiTokens: [
            API_TOKEN,
            {
              ...API_TOKEN,
              apiTokenId: 'token-3',
              name: 'old-pc',
              hint: 'shk_Qw7e',
              lastUsedAt: '2026-11-10T00:00:00.000Z',
            },
          ],
        });
      case '/sources':
        return Promise.resolve({
          sources: [SOURCE],
          page: 1,
          pageSize: 10,
          totalCount: 1,
          totalPages: 1,
        });
      default:
        return Promise.reject(new Error(`Unexpected GET ${path}`));
    }
  });
  const client = { get, post, delete: del } as unknown as HttpClient;
  return { client, get, post, del };
}

function PostDetailStub() {
  const { id } = useParams();
  return <p>post detail {id}</p>;
}

function renderPage(client: HttpClient) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <HttpClientProvider client={client}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/posts/:id" element={<PostDetailStub />} />
          </Routes>
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

async function typeCommand(prompt: string | RegExp, line: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(prompt), `${line}{Enter}`);
  return user;
}

describe('LandingPage terminal', () => {
  it('ls는 최신 post를 tree로 보이고 남은 수를 알린다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'ls');

    const log = screen.getByRole('log');
    const link = await within(log).findByRole('link', { name: POST.title });
    expect(link.getAttribute('href')).toBe('/posts/post-1');
    expect(within(log).getByText(/12 posts/)).toBeDefined();
    expect(within(log).getByText(/… 11 more · ls -a/)).toBeDefined();
  });

  it('cat은 제목으로 post 상세 페이지로 이동한다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', `cat ${POST.title}`);

    expect(await screen.findByText('post detail post-1')).toBeDefined();
  });

  it('grep은 검색 결과를 보인다', async () => {
    const { client, get } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'grep redis');

    const log = screen.getByRole('log');
    expect(await within(log).findByText(/1 match/)).toBeDefined();
    expect(within(log).getByText(/세션 토큰은/).textContent).toBe('세션 토큰은 Redis에 저장한다');
    // 강조한 부분이 링크 안에서 별도 요소라서 이름 대신 글자로 찾는다.
    const link = within(log).getByRole('link', {
      name: /에 로그인 세션 저장하기/,
    });
    expect(link.textContent).toBe(POST.title);
    expect(within(link).getByText('Redis', { selector: 'mark' })).toBeDefined();
    expect(get).toHaveBeenCalledWith('/posts/search', expect.anything(), {
      q: 'redis',
      limit: '10',
    });
  });

  it('grep 뒤에 cat과 Tab을 누르면 결과 제목을 채운다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    const user = await typeCommand('guest@hash:~$', 'grep redis');
    await within(screen.getByRole('log')).findByText(/1 match/);
    const input = screen.getByLabelText('guest@hash:~$');
    await user.type(input, 'cat re{Tab}');

    expect((input as HTMLInputElement).value).toBe(`cat ${POST.title}`);
  });

  it('cat은 제목 앞부분이 한 글에만 맞으면 그 글을 연다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'ls');
    await within(screen.getByRole('log')).findByText(/12 posts/);
    await typeCommand('guest@hash:~$', 'cat redis');

    expect(await screen.findByText('post detail post-1')).toBeDefined();
  });

  it('ai는 아직 준비 중이라고 알린다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'ai 세션은 어디에 저장했어?');

    expect(await screen.findByText('ai: not ready yet. Try grep <word> for now.')).toBeDefined();
  });

  it('방문자에게 sources 폴더는 없는 것으로 답한다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'cd sources');

    expect(await screen.findByText('cd: no such file or directory: sources')).toBeDefined();
  });

  describe('su', () => {
    it('맞는 비밀번호면 소유자 프롬프트로 바뀐다', async () => {
      const { client, post } = buildMockHttpClient();
      renderPage(client);

      const user = await typeCommand('guest@hash:~$', 'su');
      await user.type(await screen.findByLabelText('Password:'), 'owner-pass{Enter}');

      expect(await screen.findByLabelText('owner@hash:~#')).toBeDefined();
      expect(post).toHaveBeenCalledWith('/auth/session', {
        password: 'owner-pass',
      });
    });

    it('틀린 비밀번호면 Authentication failure를 알린다', async () => {
      const { client } = buildMockHttpClient({
        post: vi.fn().mockRejectedValue(
          new HttpError(401, 'Unauthorized', {
            code: 'auth.invalid_credentials',
            details: {},
          }),
        ),
      });
      renderPage(client);

      const user = await typeCommand('guest@hash:~$', 'su');
      await user.type(await screen.findByLabelText('Password:'), 'wrong{Enter}');

      expect(await screen.findByText('su: Authentication failure')).toBeDefined();
      expect(screen.getByLabelText('guest@hash:~$')).toBeDefined();
    });

    it('잠기면 남은 시간을 분으로 올려 알린다', async () => {
      const { client } = buildMockHttpClient({
        post: vi.fn().mockRejectedValue(
          new HttpError(429, 'Too Many Requests', {
            code: 'auth.too_many_attempts',
            details: { retryAfterSeconds: 241 },
          }),
        ),
      });
      renderPage(client);

      const user = await typeCommand('guest@hash:~$', 'su');
      await user.type(await screen.findByLabelText('Password:'), 'wrong{Enter}');

      expect(await screen.findByText('su: too many attempts. Try again in 5 minutes.')).toBeDefined();
    });

    it('빈 비밀번호는 API를 부르지 않고 실패로 알린다', async () => {
      const { client, post } = buildMockHttpClient();
      renderPage(client);

      const user = await typeCommand('guest@hash:~$', 'su');
      await user.type(await screen.findByLabelText('Password:'), '{Enter}');

      expect(await screen.findByText('su: Authentication failure')).toBeDefined();
      expect(post).not.toHaveBeenCalled();
    });
  });

  it('노란 점은 방문자에게 su를 실행한다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Log in' }));

    expect(await screen.findByLabelText('Password:')).toBeDefined();
  });

  describe('소유자', () => {
    it('ls 맨 위에 sources 폴더를 보인다', async () => {
      const { client } = buildMockHttpClient({ authenticated: true });
      renderPage(client);

      await typeCommand('owner@hash:~#', 'ls');

      const log = screen.getByRole('log');
      expect(await within(log).findByText('sources/')).toBeDefined();
    });

    it('cd sources 뒤의 ls는 source 목록을 보인다', async () => {
      const { client } = buildMockHttpClient({ authenticated: true });
      renderPage(client);

      await typeCommand('owner@hash:~#', 'cd sources');
      await typeCommand('owner@hash:~/sources#', 'ls');

      const link = await within(screen.getByRole('log')).findByRole('link', {
        name: SOURCE.title,
      });
      expect(link.getAttribute('href')).toBe('/sources/source-1');
    });

    it('exit는 세션을 지우고 방문자 프롬프트로 돌아간다', async () => {
      const { client, del } = buildMockHttpClient({ authenticated: true });
      renderPage(client);

      await typeCommand('owner@hash:~#', 'cd sources');
      await typeCommand('owner@hash:~/sources#', 'exit');

      expect(await screen.findByLabelText('guest@hash:~$')).toBeDefined();
      expect(del).toHaveBeenCalledWith('/auth/session');
    });
  });
  describe('token', () => {
    it('방문자에게는 권한이 없다고 답한다', async () => {
      const { client, get } = buildMockHttpClient();
      renderPage(client);

      await typeCommand('guest@hash:~$', 'token');

      expect(await screen.findByText('token: permission denied')).toBeDefined();
      expect(get).not.toHaveBeenCalledWith('/api-tokens', expect.anything());
    });

    it('토큰 목록을 tree로 보인다', async () => {
      const { client } = buildMockHttpClient({ authenticated: true });
      renderPage(client);

      await typeCommand('owner@hash:~#', 'token');

      const log = screen.getByRole('log');
      expect(await within(log).findByText('2 tokens')).toBeDefined();
      expect(within(log).getByText('macbook')).toBeDefined();
      expect(within(log).getByText(/shk_Ab3d… · created Nov 18 · never used/)).toBeDefined();
      expect(within(log).getByText(/shk_Qw7e… · created Nov 18 · used Nov 10/)).toBeDefined();
    });

    it('create는 원문을 한 번 보이고 다시 볼 수 없다고 알린다', async () => {
      const post = vi.fn().mockResolvedValue(ISSUED_TOKEN);
      const { client } = buildMockHttpClient({ authenticated: true, post });
      renderPage(client);

      await typeCommand('owner@hash:~#', 'token create desktop');

      expect(await screen.findByText('created desktop')).toBeDefined();
      expect(screen.getByText('shk_Zx9qSECRET')).toBeDefined();
      expect(screen.getByText('Copy it now. It will not be shown again.')).toBeDefined();
      expect(post).toHaveBeenCalledWith('/api-tokens', { name: 'desktop', permissions: ['sources:sync'] }, expect.anything());
    });

    it('같은 이름이 있으면 이미 있다고 알린다', async () => {
      const post = vi.fn().mockRejectedValue(
        new HttpError(409, 'Conflict', {
          code: 'api_token.name_taken',
          details: {},
        }),
      );
      const { client } = buildMockHttpClient({ authenticated: true, post });
      renderPage(client);

      await typeCommand('owner@hash:~#', 'token create macbook');

      expect(await screen.findByText('token: macbook already exists')).toBeDefined();
    });

    it('revoke는 확인을 받은 뒤 이름으로 찾은 토큰을 폐기한다', async () => {
      const { client, del } = buildMockHttpClient({ authenticated: true });
      renderPage(client);

      const user = await typeCommand('owner@hash:~#', 'token revoke macbook');
      await user.type(await screen.findByLabelText('Revoke macbook? Programs using it stop working. [y/N]'), 'y{Enter}');

      expect(await screen.findByText('revoked macbook')).toBeDefined();
      expect(del).toHaveBeenCalledWith('/api-tokens/token-1');
    });

    it('revoke를 확인하지 않으면 폐기하지 않는다', async () => {
      const { client, del } = buildMockHttpClient({ authenticated: true });
      renderPage(client);

      const user = await typeCommand('owner@hash:~#', 'token revoke macbook');
      await user.type(await screen.findByLabelText('Revoke macbook? Programs using it stop working. [y/N]'), '{Enter}');

      expect(await screen.findByText('kept macbook')).toBeDefined();
      expect(del).not.toHaveBeenCalled();
    });

    it('없는 이름은 폐기하지 않고 알린다', async () => {
      const { client, del } = buildMockHttpClient({ authenticated: true });
      renderPage(client);

      await typeCommand('owner@hash:~#', 'token revoke nope');

      expect(await screen.findByText('token: nope: no such token')).toBeDefined();
      expect(del).not.toHaveBeenCalled();
    });

    it('목록을 본 뒤 revoke와 Tab을 누르면 이름을 채운다', async () => {
      const { client } = buildMockHttpClient({ authenticated: true });
      renderPage(client);

      await typeCommand('owner@hash:~#', 'token');
      await screen.findByText('2 tokens');
      const user = userEvent.setup();
      const input = screen.getByLabelText('owner@hash:~#');
      await user.type(input, 'token revoke ma');
      await user.keyboard('{Tab}');

      expect((input as HTMLInputElement).value).toBe('token revoke macbook');
    });
  });
});
