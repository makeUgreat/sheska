import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { ArchiveIndex, type ArchiveEntry } from './archive-index';

const entries: ArchiveEntry[] = [
  {
    id: 'cilium',
    href: '/posts/cilium',
    title: 'Kubernetes 홈랩에서 Cilium으로 갈아탄 이유',
    date: '2026-09-12T12:00:00.000Z',
  },
  {
    id: 'proxmox',
    href: '/posts/proxmox',
    title: 'Proxmox 클러스터 스토리지 설계',
    date: '2026-09-03T12:00:00.000Z',
  },
  {
    id: 'long',
    href: '/posts/long',
    title:
      'A deliberately long archive title that must stay on one line and end with an ellipsis instead of wrapping',
    date: '2026-01-20T12:00:00.000Z',
  },
  {
    id: 'hnsw',
    href: '/posts/hnsw',
    title: 'pgvector HNSW 인덱스 튜닝 기록',
    date: '2025-08-27T12:00:00.000Z',
  },
];

const meta = {
  title: 'Shared/ArchiveIndex',
  component: ArchiveIndex,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="max-w-measure">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: { entries },
} satisfies Meta<typeof ArchiveIndex>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ByYear: Story = {};

export const WithDetail: Story = {
  args: {
    entries: entries.map((entry) => ({
      ...entry,
      detail:
        'Flannel로는 네트워크 정책을 걸 수 없었다. 노드 3대에서 eBPF 기반 데이터플레인으로 옮기며 바뀐 지연과 운영 비용을 정리한다.',
    })),
  },
};
