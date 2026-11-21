import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from '@/pages/landing';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';
import { SeasonProvider, type Season } from '@/shared/lib';

const NOW = '2026-11-18T00:00:00.000Z';

const POST = {
  postId: 'post-1',
  sourceId: 'post-1',
  title: 'Redis에 로그인 세션 저장하기',
  viewCount: 0,
  summary: { status: 'pending' },
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
          posts: searchHits(params?.q),
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

function searchHits(query: string | undefined) {
  switch (query) {
    case 'redis':
      return [{ ...POST, matchReason: 'both', similarity: 92, snippet: '세션 토큰은 Redis에\n저장한다' }];
    case 'session':
      return [{ ...POST, matchReason: 'semantic', similarity: 71, snippet: null }];
    default:
      return [];
  }
}

function PostDetailStub() {
  const { id } = useParams();
  return <p>post detail {id}</p>;
}

function renderPage(client: HttpClient, season: Season | null = null) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <HttpClientProvider client={client}>
          <SeasonProvider season={season}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/posts" element={<p>posts page</p>} />
              <Route path="/posts/:id" element={<PostDetailStub />} />
            </Routes>
          </SeasonProvider>
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function textContentIs(text: string) {
  return (_: string, element: Element | null) => element?.textContent === text;
}

async function typeCommand(prompt: string | RegExp, line: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(prompt), `${line}{Enter}`);
  return user;
}

describe('LandingPage terminal', () => {
  it('ls posts는 최신 post를 tree로 보이고 남은 수를 알린다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'ls posts');

    const log = screen.getByRole('log');
    const link = await within(log).findByRole('link', { name: POST.title });
    expect(link.getAttribute('href')).toBe('/posts/post-1');
    // 올라가는 숫자는 aria-hidden이라 화면 낭독기가 읽는 최종 값으로 찾는다.
    expect(within(log).getByText('12 posts', { ignore: '[aria-hidden="true"]' })).toBeDefined();
    expect(within(log).getByText('… 11 more · ls -a posts')).toBeDefined();
  });

  it('posts 폴더에서 cat은 제목으로 post 상세 페이지로 이동한다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'cd posts');
    await typeCommand('guest@hash:~/posts$', `cat ${POST.title}`);

    expect(await screen.findByText('post detail post-1')).toBeDefined();
  });

  it('grep은 검색 결과를 보인다', async () => {
    const { client, get } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'grep redis');

    const log = screen.getByRole('log');
    expect(await within(log).findByText(/1 match/)).toBeDefined();
    expect(within(log).getByText(/세션 토큰은/).textContent).toBe('세션 토큰은 Redis에 저장한다');
    expect(within(log).getByText('92%', { ignore: '[aria-hidden="true"]' })).toBeDefined();
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

  it('grep은 의미로만 찾은 글에 유사도를 보인다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'grep session');

    const log = screen.getByRole('log');
    expect(await within(log).findByText('71%', { ignore: '[aria-hidden="true"]' })).toBeDefined();
    expect(within(log).getByText(/similar in meaning/)).toBeDefined();
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

    await typeCommand('guest@hash:~$', 'ls posts');
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

  it('방문자의 ls는 sources 폴더를 보이되 세지 않는다', async () => {
    const { client, get } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'ls');

    const log = screen.getByRole('log');
    expect(await within(log).findByText('12 posts')).toBeDefined();
    expect(within(log).getByText('sources/')).toBeDefined();
    expect(get.mock.calls.map(([path]) => path)).not.toContain('/sources');
  });

  it('방문자는 sources 폴더에 들어갈 수 없다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'cd sources');

    expect(await screen.findByText('cd: permission denied: sources')).toBeDefined();
  });

  it('cd ..로 홈 밖에 나가면 프롬프트에 절대 경로를 보인다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'cd ..');

    expect(await screen.findByLabelText('guest@hash:/home$')).toBeDefined();
  });

  it('홈에서 cat posts/<제목>은 post 상세 페이지로 이동한다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', `cat posts/${POST.title}`);

    expect(await screen.findByText('post detail post-1')).toBeDefined();
  });

  it('cat은 폴더를 읽지 않는다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'cat posts');

    expect(await screen.findByText('cat: posts: Is a directory')).toBeDefined();
  });

  it('방문자는 sources 안의 글을 cat으로 열 수 없다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', `cat sources/${SOURCE.title}`);

    expect(await screen.findByText(`cat: sources/${SOURCE.title}: Permission denied`)).toBeDefined();
  });

  it('ls /dev는 secret 파일을 보이고 cat은 그 내용을 보인다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'ls /dev');
    expect(await within(screen.getByRole('log')).findByText('secret')).toBeDefined();

    await typeCommand('guest@hash:~$', 'cat /dev/secret');
    expect(await screen.findByText(/-----BEGIN HASH SECRET KEY-----/)).toBeDefined();
  });

  it('cd는 파일로 들어가지 않는다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'cd /dev/secret');

    expect(await screen.findByText('cd: not a directory: /dev/secret')).toBeDefined();
  });

  describe('open', () => {
    it('폴더를 그 목록 페이지로 연다', async () => {
      const { client } = buildMockHttpClient();
      renderPage(client);

      await typeCommand('guest@hash:~$', 'open posts');

      expect(await screen.findByText('posts page')).toBeDefined();
    });

    it('경로가 없으면 현재 폴더를 연다', async () => {
      const { client } = buildMockHttpClient();
      renderPage(client);

      await typeCommand('guest@hash:~$', 'cd posts');
      await typeCommand('guest@hash:~/posts$', 'open');

      expect(await screen.findByText('posts page')).toBeDefined();
    });

    it('글 경로를 그 상세 페이지로 연다', async () => {
      const { client } = buildMockHttpClient();
      renderPage(client);

      await typeCommand('guest@hash:~$', `open posts/${POST.title}`);

      expect(await screen.findByText('post detail post-1')).toBeDefined();
    });

    it('방문자는 sources를 열 수 없다', async () => {
      const { client } = buildMockHttpClient();
      renderPage(client);

      await typeCommand('guest@hash:~$', 'open sources');

      expect(await screen.findByText('open: sources: Permission denied')).toBeDefined();
    });

    it('페이지가 없는 폴더는 열 수 없다고 답한다', async () => {
      const { client } = buildMockHttpClient();
      renderPage(client);

      await typeCommand('guest@hash:~$', 'open /dev');

      expect(await screen.findByText('open: /dev: no page to open')).toBeDefined();
    });
  });

  it('pwd는 현재 폴더의 절대 경로를 보인다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('guest@hash:~$', 'cd posts');
    await typeCommand('guest@hash:~/posts$', 'pwd');

    expect(await screen.findByText('/home/hash/posts')).toBeDefined();
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
    it('ls는 홈의 폴더를 개수와 함께 보인다', async () => {
      const { client } = buildMockHttpClient({ authenticated: true });
      renderPage(client);

      await typeCommand('owner@hash:~#', 'ls');

      const log = screen.getByRole('log');
      expect(await within(log).findByText('1 note')).toBeDefined();
      expect(within(log).getByText('sources/')).toBeDefined();
      expect(within(log).getByText('12 posts')).toBeDefined();
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
  describe('겨울 시즌', () => {
    it('snow는 내리는 눈을 멈추고, 다시 입력하면 다시 내리게 한다', async () => {
      const { client } = buildMockHttpClient();
      renderPage(client, 'winter');

      await typeCommand('guest@hash:~$', 'snow');
      expect(await screen.findByText('Snowfall stopped. Type snow to start it again.')).toBeDefined();

      await typeCommand('guest@hash:~$', 'snow');
      expect(await screen.findByText('Snowfall started.')).toBeDefined();
    });

    it('상태 줄은 snow 명령에 따라 눈이 내리는지 보여 준다', async () => {
      const { client } = buildMockHttpClient();
      renderPage(client, 'winter');

      expect(await screen.findByText(textContentIs('snow on'))).toBeDefined();

      await typeCommand('guest@hash:~$', 'snow');
      expect(await screen.findByText(textContentIs('snow off'))).toBeDefined();
    });

    it('겨울이 아니면 상태 줄이 없다', async () => {
      const { client } = buildMockHttpClient();
      renderPage(client);

      await screen.findByLabelText('guest@hash:~$');

      expect(screen.queryByText(textContentIs('snow on'))).toBeNull();
    });

    it('겨울이 아니면 snow 명령이 없다', async () => {
      const { client } = buildMockHttpClient();
      renderPage(client);

      await typeCommand('guest@hash:~$', 'snow');

      expect(await screen.findByText('hash: command not found: snow')).toBeDefined();
    });
  });

  describe('이스터에그', () => {
    it('방문자의 sudo는 sudoers에 없다고 답한다', async () => {
      const { client } = buildMockHttpClient();
      renderPage(client);

      await typeCommand('guest@hash:~$', 'sudo ls');

      expect(await screen.findByText("guest is not in the sudoers file. Let's get to know each other first.")).toBeDefined();
    });

    it('소유자의 sudo는 뒤의 명령을 실행한다', async () => {
      const { client } = buildMockHttpClient({ authenticated: true });
      renderPage(client);

      await typeCommand('owner@hash:~#', 'sudo pwd');

      expect(await screen.findByText('/home/hash')).toBeDefined();
    });

    it('rm -rf /는 안전장치에 걸리고 넘는 방법을 알려 준다', async () => {
      const { client } = buildMockHttpClient();
      renderPage(client);

      await typeCommand('guest@hash:~$', 'rm -rf /');

      expect(
        await screen.findByText("rm: it is dangerous to operate recursively on '/'. --no-preserve-root exists, if you're curious."),
      ).toBeDefined();
    });

    it('방문자의 rm은 거의 지울 뻔하다 실패한다', async () => {
      const { client } = buildMockHttpClient();
      renderPage(client);

      await typeCommand('guest@hash:~$', 'rm posts');

      expect(await screen.findByText("rm: cannot remove 'posts': Got to 99%, then the system got cold feet.")).toBeDefined();
    });

    it('소유자의 rm은 읽기 전용을 핑계로 실패한다', async () => {
      const { client } = buildMockHttpClient({ authenticated: true });
      renderPage(client);

      await typeCommand('owner@hash:~#', 'rm posts');

      expect(await screen.findByText("rm: cannot remove 'posts': Got to 99%, then the disk remembered it's read-only.")).toBeDefined();
    });

    it('안전장치를 넘은 rm도 마지막에 실패한다', async () => {
      const { client } = buildMockHttpClient({ authenticated: true });
      renderPage(client);

      await typeCommand('owner@hash:~#', 'rm -rf --no-preserve-root /');

      expect(
        await screen.findByText("rm: cannot remove '/': Made it past the failsafe, got to 99%, then tripped on the last byte."),
      ).toBeDefined();
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
