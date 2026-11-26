import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { type EmbeddingInfo, type SyncJob } from '@/entities/source';
import { SourceSyncSection } from './source-sync-section';

const STARTED = '2026-11-26T05:02:00.000Z';

const EMBEDDING: EmbeddingInfo = {
  model: 'qwen3-embedding:0.6b',
  dimensions: 1024,
  createdAt: '2026-11-20T00:14:00.000Z',
  updatedAt: '2026-11-24T01:31:00.000Z',
};

function syncJob(overrides: Partial<SyncJob>): SyncJob {
  return {
    syncJobId: 'sync-job-1',
    sourceId: 'source-1',
    fingerprint: 'fingerprint-1',
    status: 'processing',
    totalChunks: 12,
    processedChunks: 7,
    createdAt: STARTED,
    ...overrides,
  };
}

const meta = {
  title: 'Pages/SourceDetail/SourceSyncSection',
  component: SourceSyncSection,
  args: {
    syncJob: syncJob({}),
    embedding: EMBEDDING,
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SourceSyncSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WaitingBeforeChunking: Story = {
  name: '청크로 나누기 전이면 대기 중이라고만 알린다',
  tags: ['!dev'],
  args: { syncJob: syncJob({ status: 'waiting', totalChunks: null, processedChunks: null }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('대기 중')).toBeDefined();
    await expect(canvas.getByText('청크 나누기 전')).toBeDefined();
    await expect(canvas.queryByRole('progressbar')).toBeNull();
  },
};

export const ProcessingCells: Story = {
  name: '임베딩 중이면 청크마다 한 칸씩 진행을 보여 준다',
  tags: ['!dev'],
  play: async ({ canvas }) => {
    await expect(canvas.getByText('임베딩 중')).toBeDefined();
    await expect(canvas.getByText('7 / 12 · 58%')).toBeDefined();
    const progress = canvas.getByRole('progressbar', { name: '임베딩한 청크' });
    await expect(progress.getAttribute('aria-valuenow')).toBe('7');
    await expect(progress.children).toHaveLength(12);
  },
};

export const ProcessingBar: Story = {
  name: '청크가 40개를 넘으면 이어진 막대로 그린다',
  tags: ['!dev'],
  args: { syncJob: syncJob({ totalChunks: 64, processedChunks: 38 }) },
  play: async ({ canvas }) => {
    const progress = canvas.getByRole('progressbar', { name: '임베딩한 청크' });
    await expect(progress.getAttribute('aria-valuemax')).toBe('64');
    await expect(progress.children).toHaveLength(1);
  },
};

export const StaleSearch: Story = {
  name: '임베딩이 끝나기 전에는 검색이 이전 임베딩 기준이라고 알린다',
  tags: ['!dev'],
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/검색은 이전 버전\(11\.24 임베딩\) 기준으로 동작합니다/)).toBeDefined();
  },
};

export const Completed: Story = {
  name: '완료하면 모든 칸을 채우고 모델을 보여 준다',
  tags: ['!dev'],
  args: { syncJob: syncJob({ status: 'completed', processedChunks: null }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('완료')).toBeDefined();
    await expect(canvas.getByText('12 청크')).toBeDefined();
    await expect(canvas.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('12');
    await expect(canvas.getByText('qwen3-embedding:0.6b · 1024d')).toBeDefined();
    await expect(canvas.queryByText(/이전 버전/)).toBeNull();
  },
};

export const Failed: Story = {
  name: '실패하면 재시도 주체를 알리고 sync job id를 복사하게 한다',
  tags: ['!dev'],
  args: { syncJob: syncJob({ status: 'failed', processedChunks: null }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('실패')).toBeDefined();
    await expect(canvas.getByText(/플러그인이 이 파일을 다시 보내면 재시도합니다/)).toBeDefined();
    await expect(canvas.getByRole('button', { name: 'sync job id 복사' })).toBeDefined();
  },
};

export const NoSyncJob: Story = {
  name: 'sync job이 없으면 기록이 없다고 알린다',
  tags: ['!dev'],
  args: { syncJob: null, embedding: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('기록 없음')).toBeDefined();
    await expect(canvas.queryByRole('progressbar')).toBeNull();
  },
};
