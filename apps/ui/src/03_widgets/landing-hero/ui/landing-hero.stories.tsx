import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpClientProvider, type HttpClientType as HttpClient } from '@/shared/api';
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
  title: 'Widgets/LandingHero',
  component: LandingHero,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    articlesHref: '/posts',
  },
} satisfies Meta<typeof LandingHero>;

export default meta;

type Story = StoryObj<typeof meta>;

function withSession(authenticated: boolean) {
  return (Story: () => React.JSX.Element) => (
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>
        <HttpClientProvider client={buildStoryHttpClient(authenticated)}>
          <Story />
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

export const Visitor: Story = { decorators: [withSession(false)] };

export const Owner: Story = { decorators: [withSession(true)] };
