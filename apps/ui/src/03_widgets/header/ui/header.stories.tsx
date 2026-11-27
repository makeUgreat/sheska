import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HttpClientProvider, type HttpClientType as HttpClient } from '@/shared/api';
import { Header } from './header';

function buildStoryHttpClient(authenticated: boolean): HttpClient {
  return {
    get: () => Promise.resolve({ authenticated }),
  } as unknown as HttpClient;
}

const meta = {
  title: 'Widgets/Header/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

function atRoute(route: string, { authenticated = false, queryClient = new QueryClient() } = {}) {
  return [
    (Story: () => React.ReactElement) => (
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>
          <HttpClientProvider client={buildStoryHttpClient(authenticated)}>
            <div className="w-screen max-w-[1280px]">
              <Story />
            </div>
          </HttpClientProvider>
        </QueryClientProvider>
      </MemoryRouter>
    ),
  ];
}

export const OnPosts: Story = { decorators: atRoute('/posts') };
export const OnPostDetail: Story = { decorators: atRoute('/posts/01932abc') };
export const OnAboutService: Story = { decorators: atRoute('/about/home-cluster') };
export const OwnerOnSources: Story = { decorators: atRoute('/sources', { authenticated: true }) };

function awaitingPage() {
  const queryClient = new QueryClient();
  void queryClient.prefetchQuery({ queryKey: ['posts', 'infinite'], queryFn: () => new Promise(() => {}) });
  return queryClient;
}

export const WaitingForPosts: Story = { decorators: atRoute('/posts', { queryClient: awaitingPage() }) };
