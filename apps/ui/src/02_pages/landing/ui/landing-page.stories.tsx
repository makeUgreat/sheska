import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpClientProvider, HttpError, type HttpClientType as HttpClient } from '@/shared/api';
import { SeasonProvider, type Season } from '@/shared/lib';
import { LandingPage } from './landing-page';

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
  post = fn(() => Promise.resolve(undefined)),
  del = fn(() => Promise.resolve(undefined)),
}: {
  authenticated?: boolean;
  post?: ReturnType<typeof fn>;
  del?: ReturnType<typeof fn>;
} = {}) {
  const get = fn((path: string, _schema: unknown, params?: Record<string, string>) => {
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

function withPage(client: HttpClient, season: Season | null = null) {
  return (Story: () => React.JSX.Element) => (
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <HttpClientProvider client={client}>
          <SeasonProvider season={season}>
            <Routes>
              <Route path="/" element={<Story />} />
              <Route path="/posts" element={<p>posts page</p>} />
              <Route path="/posts/:id" element={<PostDetailStub />} />
            </Routes>
          </SeasonProvider>
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

const meta = {
  title: 'Pages/Landing/LandingPage',
  component: LandingPage,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof LandingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

function textContentIs(text: string) {
  return (_: string, element: Element | null) => element?.textContent === text;
}

async function typeCommand({ canvas, userEvent }: PlayContext, prompt: string | RegExp, line: string) {
  await userEvent.type(await canvas.findByLabelText(prompt), `${line}{Enter}`);
}

export const LsPosts: Story = {
  name: 'ls posts는 최신 post를 tree로 보이고 남은 수를 알린다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'ls posts');

    const log = canvas.getByRole('log');
    const link = await within(log).findByRole('link', { name: POST.title });
    await expect(link.getAttribute('href')).toBe('/posts/post-1');
    await expect(within(log).getByText('12 posts', { ignore: '[aria-hidden="true"]' })).toBeDefined();
    await expect(within(log).getByText('… 11 more · ls -a posts')).toBeDefined();
  },
};

export const CatInPosts: Story = {
  name: 'posts 폴더에서 cat은 제목으로 post 상세 페이지로 이동한다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'cd posts');
    await typeCommand(context, 'guest@hash:~/posts$', `cat ${POST.title}`);

    await expect(await canvas.findByText('post detail post-1')).toBeDefined();
  },
};

const grepHttp = buildMockHttpClient();

export const Grep: Story = {
  name: 'grep은 검색 결과를 보인다',
  tags: ['!dev'],
  decorators: [withPage(grepHttp.client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'grep redis');

    const log = canvas.getByRole('log');
    await expect(await within(log).findByText(/1 match/)).toBeDefined();
    await expect(within(log).getByText(/세션 토큰은/).textContent).toBe('세션 토큰은 Redis에 저장한다');
    await expect(within(log).getByText('92%', { ignore: '[aria-hidden="true"]' })).toBeDefined();
    const link = within(log).getByRole('link', {
      name: /에 로그인 세션 저장하기/,
    });
    await expect(link.textContent).toBe(POST.title);
    await expect(within(link).getByText('Redis', { selector: 'mark' })).toBeDefined();
    await expect(grepHttp.get).toHaveBeenCalledWith('/posts/search', expect.anything(), {
      q: 'redis',
      limit: '10',
    });
  },
};

export const GrepSemantic: Story = {
  name: 'grep은 의미로만 찾은 글에 유사도를 보인다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'grep session');

    const log = canvas.getByRole('log');
    await expect(await within(log).findByText('71%', { ignore: '[aria-hidden="true"]' })).toBeDefined();
    await expect(within(log).getByText(/similar in meaning/)).toBeDefined();
  },
};

export const GrepThenCatTab: Story = {
  name: 'grep 뒤에 cat과 Tab을 누르면 결과 제목을 채운다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas, userEvent } = context;

    await typeCommand(context, 'guest@hash:~$', 'grep redis');
    await within(canvas.getByRole('log')).findByText(/1 match/);
    const input = canvas.getByLabelText('guest@hash:~$');
    await userEvent.type(input, 'cat re');
    await userEvent.keyboard('{Tab}');

    await expect((input as HTMLInputElement).value).toBe(`cat ${POST.title}`);
  },
};

export const CatByPrefix: Story = {
  name: 'cat은 제목 앞부분이 한 글에만 맞으면 그 글을 연다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'ls posts');
    await within(canvas.getByRole('log')).findByText(/12 posts/, { ignore: '[aria-hidden="true"]' });
    await typeCommand(context, 'guest@hash:~$', 'cat redis');

    await expect(await canvas.findByText('post detail post-1')).toBeDefined();
  },
};

export const AiNotReady: Story = {
  name: 'ai는 아직 준비 중이라고 알린다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'ai 세션은 어디에 저장했어?');

    await expect(await canvas.findByText('ai: not ready yet. Try grep <word> for now.')).toBeDefined();
  },
};

const guestLsHttp = buildMockHttpClient();

export const GuestLs: Story = {
  name: '방문자의 ls는 sources 폴더를 보이되 세지 않는다',
  tags: ['!dev'],
  decorators: [withPage(guestLsHttp.client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'ls');

    const log = canvas.getByRole('log');
    await expect(await within(log).findByText('12 posts')).toBeDefined();
    await expect(within(log).getByText('sources/')).toBeDefined();
    await expect(guestLsHttp.get.mock.calls.map(([path]) => path)).not.toContain('/sources');
  },
};

export const GuestCdSources: Story = {
  name: '방문자는 sources 폴더에 들어갈 수 없다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'cd sources');

    await expect(await canvas.findByText('cd: permission denied: sources')).toBeDefined();
  },
};

export const CdOutOfHome: Story = {
  name: 'cd ..로 홈 밖에 나가면 프롬프트에 절대 경로를 보인다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'cd ..');

    await expect(await canvas.findByLabelText('guest@hash:/home$')).toBeDefined();
  },
};

export const CatPostPathFromHome: Story = {
  name: '홈에서 cat posts/<제목>은 post 상세 페이지로 이동한다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', `cat posts/${POST.title}`);

    await expect(await canvas.findByText('post detail post-1')).toBeDefined();
  },
};

export const CatDirectory: Story = {
  name: 'cat은 폴더를 읽지 않는다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'cat posts');

    await expect(await canvas.findByText('cat: posts: Is a directory')).toBeDefined();
  },
};

export const GuestCatSource: Story = {
  name: '방문자는 sources 안의 글을 cat으로 열 수 없다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', `cat sources/${SOURCE.title}`);

    await expect(await canvas.findByText(`cat: sources/${SOURCE.title}: Permission denied`)).toBeDefined();
  },
};

export const DevSecret: Story = {
  name: 'ls /dev는 secret 파일을 보이고 cat은 그 내용을 보인다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'ls /dev');
    await expect(await within(canvas.getByRole('log')).findByText('secret')).toBeDefined();

    await typeCommand(context, 'guest@hash:~$', 'cat /dev/secret');
    await expect(await canvas.findByText(/-----BEGIN HASH SECRET KEY-----/)).toBeDefined();
  },
};

export const CdIntoFile: Story = {
  name: 'cd는 파일로 들어가지 않는다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'cd /dev/secret');

    await expect(await canvas.findByText('cd: not a directory: /dev/secret')).toBeDefined();
  },
};

export const OpenFolder: Story = {
  name: 'open › 폴더를 그 목록 페이지로 연다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'open posts');

    await expect(await canvas.findByText('posts page')).toBeDefined();
  },
};

export const OpenCurrentFolder: Story = {
  name: 'open › 경로가 없으면 현재 폴더를 연다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'cd posts');
    await typeCommand(context, 'guest@hash:~/posts$', 'open');

    await expect(await canvas.findByText('posts page')).toBeDefined();
  },
};

export const OpenPost: Story = {
  name: 'open › 글 경로를 그 상세 페이지로 연다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', `open posts/${POST.title}`);

    await expect(await canvas.findByText('post detail post-1')).toBeDefined();
  },
};

export const GuestOpenSources: Story = {
  name: 'open › 방문자는 sources를 열 수 없다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'open sources');

    await expect(await canvas.findByText('open: sources: Permission denied')).toBeDefined();
  },
};

export const OpenFolderWithoutPage: Story = {
  name: 'open › 페이지가 없는 폴더는 열 수 없다고 답한다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'open /dev');

    await expect(await canvas.findByText('open: /dev: no page to open')).toBeDefined();
  },
};

export const Pwd: Story = {
  name: 'pwd는 현재 폴더의 절대 경로를 보인다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'cd posts');
    await typeCommand(context, 'guest@hash:~/posts$', 'pwd');

    await expect(await canvas.findByText('/home/hash/posts')).toBeDefined();
  },
};

const suHttp = buildMockHttpClient();

export const SuWithPassword: Story = {
  name: 'su › 맞는 비밀번호면 소유자 프롬프트로 바뀐다',
  tags: ['!dev'],
  decorators: [withPage(suHttp.client)],
  play: async (context) => {
    const { canvas, userEvent } = context;

    await typeCommand(context, 'guest@hash:~$', 'su');
    await userEvent.type(await canvas.findByLabelText('Password:'), 'owner-pass{Enter}');

    await expect(await canvas.findByLabelText('owner@hash:~#')).toBeDefined();
    await expect(suHttp.post).toHaveBeenCalledWith('/auth/session', {
      password: 'owner-pass',
    });
  },
};

export const SuWrongPassword: Story = {
  name: 'su › 틀린 비밀번호면 Authentication failure를 알린다',
  tags: ['!dev'],
  decorators: [
    withPage(
      buildMockHttpClient({
        post: fn(() =>
          Promise.reject(
            new HttpError(401, 'Unauthorized', {
              code: 'auth.invalid_credentials',
              details: {},
            }),
          ),
        ),
      }).client,
    ),
  ],
  play: async (context) => {
    const { canvas, userEvent } = context;

    await typeCommand(context, 'guest@hash:~$', 'su');
    await userEvent.type(await canvas.findByLabelText('Password:'), 'wrong{Enter}');

    await expect(await canvas.findByText('su: Authentication failure')).toBeDefined();
    await expect(canvas.getByLabelText('guest@hash:~$')).toBeDefined();
  },
};

export const SuLocked: Story = {
  name: 'su › 잠기면 남은 시간을 분으로 올려 알린다',
  tags: ['!dev'],
  decorators: [
    withPage(
      buildMockHttpClient({
        post: fn(() =>
          Promise.reject(
            new HttpError(429, 'Too Many Requests', {
              code: 'auth.too_many_attempts',
              details: { retryAfterSeconds: 241 },
            }),
          ),
        ),
      }).client,
    ),
  ],
  play: async (context) => {
    const { canvas, userEvent } = context;

    await typeCommand(context, 'guest@hash:~$', 'su');
    await userEvent.type(await canvas.findByLabelText('Password:'), 'wrong{Enter}');

    await expect(await canvas.findByText('su: too many attempts. Try again in 5 minutes.')).toBeDefined();
  },
};

const suEmptyHttp = buildMockHttpClient();

export const SuEmptyPassword: Story = {
  name: 'su › 빈 비밀번호는 API를 부르지 않고 실패로 알린다',
  tags: ['!dev'],
  decorators: [withPage(suEmptyHttp.client)],
  play: async (context) => {
    const { canvas, userEvent } = context;

    await typeCommand(context, 'guest@hash:~$', 'su');
    await userEvent.type(await canvas.findByLabelText('Password:'), '{Enter}');

    await expect(await canvas.findByText('su: Authentication failure')).toBeDefined();
    await expect(suEmptyHttp.post).not.toHaveBeenCalled();
  },
};

export const YellowDotRunsSu: Story = {
  name: '노란 점은 방문자에게 su를 실행한다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Log in' }));

    await expect(await canvas.findByLabelText('Password:')).toBeDefined();
  },
};

export const OwnerLs: Story = {
  name: '소유자 › ls는 홈의 폴더를 개수와 함께 보인다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient({ authenticated: true }).client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'owner@hash:~#', 'ls');

    const log = canvas.getByRole('log');
    await expect(await within(log).findByText('1 note')).toBeDefined();
    await expect(within(log).getByText('sources/')).toBeDefined();
    await expect(within(log).getByText('12 posts')).toBeDefined();
  },
};

export const OwnerLsSources: Story = {
  name: '소유자 › cd sources 뒤의 ls는 source 목록을 보인다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient({ authenticated: true }).client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'owner@hash:~#', 'cd sources');
    await typeCommand(context, 'owner@hash:~/sources#', 'ls');

    const link = await within(canvas.getByRole('log')).findByRole('link', {
      name: SOURCE.title,
    });
    await expect(link.getAttribute('href')).toBe('/sources/source-1');
  },
};

const ownerExitHttp = buildMockHttpClient({ authenticated: true });

export const OwnerExit: Story = {
  name: '소유자 › exit는 세션을 지우고 방문자 프롬프트로 돌아간다',
  tags: ['!dev'],
  decorators: [withPage(ownerExitHttp.client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'owner@hash:~#', 'cd sources');
    await typeCommand(context, 'owner@hash:~/sources#', 'exit');

    await expect(await canvas.findByLabelText('guest@hash:~$')).toBeDefined();
    await expect(ownerExitHttp.del).toHaveBeenCalledWith('/auth/session');
  },
};

export const SnowToggle: Story = {
  name: '겨울 시즌 › snow는 내리는 눈을 멈추고, 다시 입력하면 다시 내리게 한다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client, 'winter')],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'snow');
    await expect(await canvas.findByText('Snowfall stopped. Type snow to start it again.')).toBeDefined();

    await typeCommand(context, 'guest@hash:~$', 'snow');
    await expect(await canvas.findByText('Snowfall started.')).toBeDefined();
  },
};

export const SnowStatusLine: Story = {
  name: '겨울 시즌 › 상태 줄은 snow 명령에 따라 눈이 내리는지 보여 준다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client, 'winter')],
  play: async (context) => {
    const { canvas } = context;

    await expect(await canvas.findByText(textContentIs('snow on'))).toBeDefined();

    await typeCommand(context, 'guest@hash:~$', 'snow');
    await expect(await canvas.findByText(textContentIs('snow off'))).toBeDefined();
  },
};

export const NoStatusLineOutOfWinter: Story = {
  name: '겨울 시즌 › 겨울이 아니면 상태 줄이 없다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async ({ canvas }) => {
    await canvas.findByLabelText('guest@hash:~$');

    await expect(canvas.queryByText(textContentIs('snow on'))).toBeNull();
  },
};

export const NoSnowOutOfWinter: Story = {
  name: '겨울 시즌 › 겨울이 아니면 snow 명령이 없다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'snow');

    await expect(await canvas.findByText('hash: command not found: snow')).toBeDefined();
  },
};

export const GuestSudo: Story = {
  name: '이스터에그 › 방문자의 sudo는 sudoers에 없다고 답한다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'sudo ls');

    await expect(await canvas.findByText("guest is not in the sudoers file. Let's get to know each other first.")).toBeDefined();
  },
};

export const OwnerSudo: Story = {
  name: '이스터에그 › 소유자의 sudo는 뒤의 명령을 실행한다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient({ authenticated: true }).client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'owner@hash:~#', 'sudo pwd');

    await expect(await canvas.findByText('/home/hash')).toBeDefined();
  },
};

export const RmRootFailsafe: Story = {
  name: '이스터에그 › rm -rf /는 안전장치에 걸리고 넘는 방법을 알려 준다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'rm -rf /');

    await expect(
      await canvas.findByText("rm: it is dangerous to operate recursively on '/'. --no-preserve-root exists, if you're curious."),
    ).toBeDefined();
  },
};

export const GuestRm: Story = {
  name: '이스터에그 › 방문자의 rm은 거의 지울 뻔하다 실패한다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient().client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'rm posts');

    await expect(await canvas.findByText("rm: cannot remove 'posts': Got to 99%, then the system got cold feet.")).toBeDefined();
  },
};

export const OwnerRm: Story = {
  name: '이스터에그 › 소유자의 rm은 읽기 전용을 핑계로 실패한다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient({ authenticated: true }).client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'owner@hash:~#', 'rm posts');

    await expect(await canvas.findByText("rm: cannot remove 'posts': Got to 99%, then the disk remembered it's read-only.")).toBeDefined();
  },
};

export const RmPastFailsafe: Story = {
  name: '이스터에그 › 안전장치를 넘은 rm도 마지막에 실패한다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient({ authenticated: true }).client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'owner@hash:~#', 'rm -rf --no-preserve-root /');

    await expect(
      await canvas.findByText("rm: cannot remove '/': Made it past the failsafe, got to 99%, then tripped on the last byte."),
    ).toBeDefined();
  },
};

const guestTokenHttp = buildMockHttpClient();

export const GuestToken: Story = {
  name: 'token › 방문자에게는 권한이 없다고 답한다',
  tags: ['!dev'],
  decorators: [withPage(guestTokenHttp.client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'guest@hash:~$', 'token');

    await expect(await canvas.findByText('token: permission denied')).toBeDefined();
    await expect(guestTokenHttp.get).not.toHaveBeenCalledWith('/api-tokens', expect.anything());
  },
};

export const TokenList: Story = {
  name: 'token › 토큰 목록을 tree로 보인다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient({ authenticated: true }).client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'owner@hash:~#', 'token');

    const log = canvas.getByRole('log');
    await expect(await within(log).findByText('2 tokens')).toBeDefined();
    await expect(within(log).getByText('macbook')).toBeDefined();
    await expect(within(log).getByText(/shk_Ab3d… · created Nov 18 · never used/)).toBeDefined();
    await expect(within(log).getByText(/shk_Qw7e… · created Nov 18 · used Nov 10/)).toBeDefined();
  },
};

const tokenCreateHttp = buildMockHttpClient({ authenticated: true, post: fn(() => Promise.resolve(ISSUED_TOKEN)) });

export const TokenCreate: Story = {
  name: 'token › create는 원문을 한 번 보이고 다시 볼 수 없다고 알린다',
  tags: ['!dev'],
  decorators: [withPage(tokenCreateHttp.client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'owner@hash:~#', 'token create desktop');

    await expect(await canvas.findByText('created desktop')).toBeDefined();
    await expect(canvas.getByText('shk_Zx9qSECRET')).toBeDefined();
    await expect(canvas.getByText('Copy it now. It will not be shown again.')).toBeDefined();
    await expect(tokenCreateHttp.post).toHaveBeenCalledWith(
      '/api-tokens',
      { name: 'desktop', permissions: ['sources:sync'] },
      expect.anything(),
    );
  },
};

export const TokenNameTaken: Story = {
  name: 'token › 같은 이름이 있으면 이미 있다고 알린다',
  tags: ['!dev'],
  decorators: [
    withPage(
      buildMockHttpClient({
        authenticated: true,
        post: fn(() =>
          Promise.reject(
            new HttpError(409, 'Conflict', {
              code: 'api_token.name_taken',
              details: {},
            }),
          ),
        ),
      }).client,
    ),
  ],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'owner@hash:~#', 'token create macbook');

    await expect(await canvas.findByText('token: macbook already exists')).toBeDefined();
  },
};

const tokenRevokeHttp = buildMockHttpClient({ authenticated: true });

export const TokenRevoke: Story = {
  name: 'token › revoke는 확인을 받은 뒤 이름으로 찾은 토큰을 폐기한다',
  tags: ['!dev'],
  decorators: [withPage(tokenRevokeHttp.client)],
  play: async (context) => {
    const { canvas, userEvent } = context;

    await typeCommand(context, 'owner@hash:~#', 'token revoke macbook');
    await userEvent.type(await canvas.findByLabelText('Revoke macbook? Programs using it stop working. [y/N]'), 'y{Enter}');

    await expect(await canvas.findByText('revoked macbook')).toBeDefined();
    await expect(tokenRevokeHttp.del).toHaveBeenCalledWith('/api-tokens/token-1');
  },
};

const tokenKeepHttp = buildMockHttpClient({ authenticated: true });

export const TokenRevokeDeclined: Story = {
  name: 'token › revoke를 확인하지 않으면 폐기하지 않는다',
  tags: ['!dev'],
  decorators: [withPage(tokenKeepHttp.client)],
  play: async (context) => {
    const { canvas, userEvent } = context;

    await typeCommand(context, 'owner@hash:~#', 'token revoke macbook');
    await userEvent.type(await canvas.findByLabelText('Revoke macbook? Programs using it stop working. [y/N]'), '{Enter}');

    await expect(await canvas.findByText('kept macbook')).toBeDefined();
    await expect(tokenKeepHttp.del).not.toHaveBeenCalled();
  },
};

const tokenUnknownHttp = buildMockHttpClient({ authenticated: true });

export const TokenRevokeUnknown: Story = {
  name: 'token › 없는 이름은 폐기하지 않고 알린다',
  tags: ['!dev'],
  decorators: [withPage(tokenUnknownHttp.client)],
  play: async (context) => {
    const { canvas } = context;

    await typeCommand(context, 'owner@hash:~#', 'token revoke nope');

    await expect(await canvas.findByText('token: nope: no such token')).toBeDefined();
    await expect(tokenUnknownHttp.del).not.toHaveBeenCalled();
  },
};

export const TokenRevokeTab: Story = {
  name: 'token › 목록을 본 뒤 revoke와 Tab을 누르면 이름을 채운다',
  tags: ['!dev'],
  decorators: [withPage(buildMockHttpClient({ authenticated: true }).client)],
  play: async (context) => {
    const { canvas, userEvent } = context;

    await typeCommand(context, 'owner@hash:~#', 'token');
    await canvas.findByText('2 tokens');
    const input = canvas.getByLabelText('owner@hash:~#');
    await userEvent.type(input, 'token revoke ma');
    await userEvent.keyboard('{Tab}');

    await expect((input as HTMLInputElement).value).toBe('token revoke macbook');
  },
};
