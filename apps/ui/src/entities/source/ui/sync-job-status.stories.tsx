import type { Meta, StoryObj } from '@storybook/react-vite';
import { type SyncJobSummary } from '@/entities/source';
import { SyncJobBadge, SyncJobProgress } from './sync-job-status';

const processingJob: SyncJobSummary = {
  syncJobId: 'sync-job-processing',
  status: 'processing',
  totalChunks: 12,
  processedChunks: 7,
  createdAt: '2026-08-05T09:30:00.000Z',
};

const meta = {
  title: 'Features/Sources/SyncJobStatus',
  component: SyncJobBadge,
  tags: ['autodocs'],
  args: {
    status: 'processing',
  },
} satisfies Meta<typeof SyncJobBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PendingBadge: Story = {
  args: {
    status: 'pending',
  },
};

export const ProcessingBadge: Story = {};

export const CompletedBadge: Story = {
  args: {
    status: 'completed',
  },
};

export const FailedBadge: Story = {
  args: {
    status: 'failed',
  },
};

export const ProcessingProgress: Story = {
  render: () => <SyncJobProgress syncJob={processingJob} />,
};

export const HiddenProgress: Story = {
  render: () => (
    <div className="font-mono text-xs text-text-muted">
      <SyncJobProgress
        syncJob={{
          ...processingJob,
          status: 'completed',
          processedChunks: 12,
        }}
      />
      Progress is hidden for non-processing jobs.
    </div>
  ),
};
