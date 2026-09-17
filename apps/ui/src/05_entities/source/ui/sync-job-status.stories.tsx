import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyncJobBadge, SyncJobProgress, type SyncJobProgressInfo } from './sync-job-status';

const processingJob: SyncJobProgressInfo = {
  status: 'processing',
  totalChunks: 12,
  processedChunks: 7,
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

export const WaitingBadge: Story = {
  args: {
    status: 'waiting',
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
