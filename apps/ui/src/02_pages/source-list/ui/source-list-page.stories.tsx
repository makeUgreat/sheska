import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { HttpClientProvider, type HttpClientType } from '@/shared/api';
import { type ListSourcesResponse } from '@/entities/source';
import { SourceListPage } from './source-list-page';

const sampleResponse: ListSourcesResponse = {
  sources: [
    {
      sourceId: 'source-storybook-intro',
      externalSourceId: 'ext-storybook-intro',
      title: 'Introducing Storybook to the Sheska UI',
      fingerprint: 'fp-1',
      sizeBytes: 24_576,
      createdAt: '2026-08-05T08:30:00.000Z',
      updatedAt: '2026-08-05T09:30:00.000Z',
      latestSyncJob: {
        syncJobId: 'sync-1',
        status: 'completed',
        totalChunks: 12,
        processedChunks: 12,
        createdAt: '2026-08-05T08:30:00.000Z',
      },
      publishedPostId: 'post-storybook-intro',
    },
    {
      sourceId: 'source-visual-fixtures',
      externalSourceId: 'ext-visual-fixtures',
      title: 'Using UI State Fixtures for Component Review',
      fingerprint: 'fp-2',
      sizeBytes: 8_192,
      createdAt: '2026-08-04T08:30:00.000Z',
      updatedAt: '2026-08-04T09:30:00.000Z',
      latestSyncJob: {
        syncJobId: 'sync-2',
        status: 'processing',
        totalChunks: 20,
        processedChunks: 7,
        createdAt: '2026-08-04T08:30:00.000Z',
      },
      publishedPostId: null,
    },
  ],
  page: 1,
  pageSize: 20,
  totalCount: 42,
  totalPages: 3,
};

function neverResolves<T>(): Promise<T> {
  return new Promise<T>(() => undefined);
}

function createHttpClientStub(get: () => Promise<unknown>): HttpClientType {
  return {
    get,
    post: () => neverResolves(),
    patch: () => neverResolves(),
  } as unknown as HttpClientType;
}

function renderWithProviders(
  http: HttpClientType,
  queryClient: QueryClient = new QueryClient(),
) {
  return (
    <MemoryRouter initialEntries={['/sources']}>
      <QueryClientProvider client={queryClient}>
        <HttpClientProvider client={http}>
          <SourceListPage />
        </HttpClientProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

const meta = {
  title: 'Pages/SourceListPage',
  component: SourceListPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SourceListPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  render: () =>
    renderWithProviders(
      createHttpClientStub(() => Promise.resolve(sampleResponse)),
    ),
};

export const Loading: Story = {
  render: () =>
    renderWithProviders(createHttpClientStub(() => neverResolves())),
};

export const FetchingNextPage: Story = {
  name: 'Fetching next page (fade transition)',
  render: () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['sources', 'list', 1, undefined], sampleResponse);
    return renderWithProviders(
      createHttpClientStub(() => neverResolves()),
      queryClient,
    );
  },
};

export const Empty: Story = {
  render: () =>
    renderWithProviders(
      createHttpClientStub(() =>
        Promise.resolve({
          sources: [],
          page: 1,
          pageSize: 20,
          totalCount: 0,
          totalPages: 1,
        } satisfies ListSourcesResponse),
      ),
    ),
};

export const ErrorState: Story = {
  render: () =>
    renderWithProviders(
      createHttpClientStub(() =>
        Promise.reject(new Error('Failed to load sources.')),
      ),
    ),
};
