import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LandingPage } from '@/pages/landing';
import {
  HttpClientProvider,
  HttpError,
  type HttpClientType as HttpClient,
} from '@/shared/api';

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

function buildMockHttpClient({
  authenticated = false,
  post = vi.fn().mockResolvedValue(undefined),
  del = vi.fn().mockResolvedValue(undefined),
}: {
  authenticated?: boolean;
  post?: ReturnType<typeof vi.fn>;
  del?: ReturnType<typeof vi.fn>;
} = {}) {
  const get = vi.fn(
    (path: string, _schema: unknown, params?: Record<string, string>) => {
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
                      matchReason: 'keyword',
                      similarity: null,
                      snippet: null,
                    },
                  ]
                : [],
            nextCursor: null,
            semanticSearchApplied: true,
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
    },
  );
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
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
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
  it('ls는 최신 post를 링크로 보이고 전체 수를 알린다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('visitor@hash:~$', 'ls');

    const log = screen.getByRole('log');
    const link = await within(log).findByRole('link', { name: POST.title });
    expect(link.getAttribute('href')).toBe('/posts/post-1');
    expect(within(log).getByText(/showing 1 of 12/)).toBeDefined();
  });

  it('cat은 제목으로 post 상세 페이지로 이동한다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('visitor@hash:~$', `cat ${POST.title}`);

    expect(await screen.findByText('post detail post-1')).toBeDefined();
  });

  it('grep은 검색 결과를 보인다', async () => {
    const { client, get } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('visitor@hash:~$', 'grep redis');

    const log = screen.getByRole('log');
    expect(
      await within(log).findByText('1 post matches "redis"'),
    ).toBeDefined();
    expect(within(log).getByRole('link', { name: POST.title })).toBeDefined();
    expect(get).toHaveBeenCalledWith('/posts/search', expect.anything(), {
      q: 'redis',
      limit: '10',
    });
  });

  it('방문자에게 sources 폴더는 없는 것으로 답한다', async () => {
    const { client } = buildMockHttpClient();
    renderPage(client);

    await typeCommand('visitor@hash:~$', 'cd sources');

    expect(
      await screen.findByText('cd: no such file or directory: sources'),
    ).toBeDefined();
  });

  describe('su', () => {
    it('맞는 비밀번호면 소유자 프롬프트로 바뀐다', async () => {
      const { client, post } = buildMockHttpClient();
      renderPage(client);

      const user = await typeCommand('visitor@hash:~$', 'su');
      await user.type(
        await screen.findByLabelText('Password:'),
        'owner-pass{Enter}',
      );

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

      const user = await typeCommand('visitor@hash:~$', 'su');
      await user.type(
        await screen.findByLabelText('Password:'),
        'wrong{Enter}',
      );

      expect(
        await screen.findByText('su: Authentication failure'),
      ).toBeDefined();
      expect(screen.getByLabelText('visitor@hash:~$')).toBeDefined();
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

      const user = await typeCommand('visitor@hash:~$', 'su');
      await user.type(
        await screen.findByLabelText('Password:'),
        'wrong{Enter}',
      );

      expect(
        await screen.findByText(
          'su: too many attempts. Try again in 5 minutes.',
        ),
      ).toBeDefined();
    });

    it('빈 비밀번호는 API를 부르지 않고 실패로 알린다', async () => {
      const { client, post } = buildMockHttpClient();
      renderPage(client);

      const user = await typeCommand('visitor@hash:~$', 'su');
      await user.type(await screen.findByLabelText('Password:'), '{Enter}');

      expect(
        await screen.findByText('su: Authentication failure'),
      ).toBeDefined();
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

      expect(await screen.findByLabelText('visitor@hash:~$')).toBeDefined();
      expect(del).toHaveBeenCalledWith('/auth/session');
    });
  });
});
