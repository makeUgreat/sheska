import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyncJobProgress, type SyncJobProgressInfo } from './sync-job-status';

const processingJob: SyncJobProgressInfo = {
  status: 'processing',
  totalChunks: 12,
  processedChunks: 7,
};

const meta = {
  title: 'Entities/Source/SyncJobProgress',
  component: SyncJobProgress,
  tags: ['autodocs'],
  args: {
    syncJob: processingJob,
  },
} satisfies Meta<typeof SyncJobProgress>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProcessingProgress: Story = {};

export const HiddenProgress: Story = {
  args: {
    syncJob: {
      ...processingJob,
      status: 'completed',
      processedChunks: 12,
    },
  },
  render: (args) => (
    <div className="font-mono text-xs text-text-muted">
      <SyncJobProgress {...args} />
      Progress is hidden for non-processing jobs.
    </div>
  ),
};
