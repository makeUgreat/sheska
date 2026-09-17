import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { type SourceSummary } from '@/entities/source';
import { SourceListItem } from './source-list-item';

const sampleSource: SourceSummary = {
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
  publishedPostId: null,
};

const meta = {
  title: 'Features/Sources/SourceListItem',
  component: SourceListItem,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <ul className="w-full max-w-[720px] divide-y divide-outline-variant/10 border-y border-outline-variant/10">
          <Story />
        </ul>
      </MemoryRouter>
    ),
  ],
  args: {
    source: sampleSource,
  },
} satisfies Meta<typeof SourceListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Published: Story = {
  args: {
    source: {
      ...sampleSource,
      publishedPostId: 'post-storybook-intro',
    },
  },
};

export const Waiting: Story = {
  args: {
    source: {
      ...sampleSource,
      latestSyncJob: {
        syncJobId: 'sync-2',
        status: 'waiting',
        totalChunks: 20,
        createdAt: '2026-08-05T08:30:00.000Z',
      },
    },
  },
};

export const NoSyncJob: Story = {
  args: {
    source: {
      ...sampleSource,
      latestSyncJob: null,
    },
  },
};

export const LongTitle: Story = {
  args: {
    source: {
      ...sampleSource,
      title:
        'A deliberately long source title that should wrap cleanly inside the source list row',
    },
  },
};
