import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpClientProvider, type HttpClientType as HttpClient } from '@/shared/api';
import { SeasonProvider, type Season } from '@/shared/lib';
import { LandingHero } from './landing-hero';

const NOW = '2026-11-18T00:00:00.000Z';

function buildStoryHttpClient(authenticated: boolean): HttpClient {
  const responses: Record<string, unknown> = {
    '/auth/session': { authenticated },
    '/posts': {
      posts: [
        {
          postId: 'post-1',
          sourceId: 'post-1',
          title: 'Redis에 로그인 세션 저장하기',
          viewCount: 0,
          summary: { status: 'pending' },
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      nextCursor: null,
    },
    '/posts/count': { count: 1 },
  };
  return {
    get: (path: string) => Promise.resolve(responses[path]),
    post: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  } as unknown as HttpClient;
}

const meta = {
  title: 'Widgets/LandingHero/LandingHero',
  component: LandingHero,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    articlesHref: '/posts',
    aboutHref: '/about',
    githubHref: 'https://github.com/makeUgreat',
  },
} satisfies Meta<typeof LandingHero>;

export default meta;

type Story = StoryObj<typeof meta>;

function withSession(authenticated: boolean, season: Season | null = null) {
  return (Story: () => React.JSX.Element) => (
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>
        <HttpClientProvider client={buildStoryHttpClient(authenticated)}>
          <SeasonProvider season={season}>
            <Story />
          </SeasonProvider>
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

export const Guest: Story = { decorators: [withSession(false)] };

export const Owner: Story = { decorators: [withSession(true)] };

export const Winter: Story = { decorators: [withSession(false, 'winter')] };

const STATUS_LINE_VIEWPORTS = {
  width320: { name: '320 × 800', styles: { width: '320px', height: '800px' } },
  width375: { name: '375 × 800', styles: { width: '375px', height: '800px' } },
  width1280: { name: '1280 × 800', styles: { width: '1280px', height: '800px' } },
};

function statusLineClearsOutput(width: 320 | 375 | 1280): Story {
  return {
    name: `${width}px에서 출력이 바닥까지 차도 상태 줄이 출력을 가리지 않는다`,
    tags: ['!dev'],
    decorators: [withSession(false, 'winter')],
    parameters: { viewport: { options: STATUS_LINE_VIEWPORTS } },
    globals: { viewport: { value: `width${width}`, isRotated: false } },
    play: async ({ canvas, userEvent }) => {
      await document.fonts.ready;
      const input = await canvas.findByLabelText('guest@hash:~$');
      for (let i = 0; i < 4; i++) {
        await userEvent.type(input, 'help{Enter}');
      }
      const scrollArea = canvas.getByRole('log').parentElement;
      const statusLine = canvas.getByText((_, element) => element?.tagName === 'SPAN' && element.textContent === 'snow on').closest('div');
      if (!scrollArea || !statusLine) throw new Error('the terminal is not rendered');
      const statusTop = statusLine.getBoundingClientRect().top;

      await expect(scrollArea.scrollHeight).toBeGreaterThan(scrollArea.clientHeight);
      await expect(scrollArea.getBoundingClientRect().bottom).toBeLessThanOrEqual(statusTop);
      await expect(input.getBoundingClientRect().bottom).toBeLessThanOrEqual(statusTop);
    },
  };
}

export const StatusLineAt320: Story = statusLineClearsOutput(320);

export const StatusLineAt375: Story = statusLineClearsOutput(375);

export const StatusLineAt1280: Story = statusLineClearsOutput(1280);
