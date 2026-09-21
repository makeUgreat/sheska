import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { type SourceSummary } from '@/entities/source';
import { SourceListSection } from './source-list-section';

const sampleSources: SourceSummary[] = [
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
      status: 'waiting',
      totalChunks: 20,
      createdAt: '2026-08-04T08:30:00.000Z',
    },
    publishedPostId: null,
  },
];

const meta = {
  title: 'Features/Sources/SourceListSection',
  component: SourceListSection,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="mx-auto max-w-[800px] px-4 py-20">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    filter: {
      value: undefined,
      onChange: () => undefined,
    },
    onPageChange: () => undefined,
    state: {
      status: 'success',
      sources: sampleSources,
      page: 1,
      totalPages: 3,
      isFetching: false,
    },
  },
} satisfies Meta<typeof SourceListSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Populated: Story = {};

export const Loading: Story = {
  args: {
    state: {
      status: 'loading',
    },
  },
};

export const Empty: Story = {
  args: {
    state: {
      status: 'empty',
    },
  },
};

export const EmptyWithFilter: Story = {
  name: 'Empty (status filter applied)',
  args: {
    filter: {
      value: 'failed',
      onChange: () => undefined,
    },
    state: {
      status: 'empty',
    },
  },
};

export const ErrorState: Story = {
  args: {
    state: {
      status: 'error',
      error: new Error('Failed to load sources.'),
    },
  },
};

export const FetchingNextPage: Story = {
  name: 'Fetching next page (fade transition)',
  args: {
    state: {
      status: 'success',
      sources: sampleSources,
      page: 2,
      totalPages: 3,
      isFetching: true,
    },
  },
};
