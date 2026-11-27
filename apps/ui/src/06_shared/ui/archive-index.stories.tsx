import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { expect } from 'storybook/test';
import { ArchiveIndex, type ArchiveEntry } from './archive-index';

const entries: ArchiveEntry[] = [
  {
    id: 'cilium',
    href: '/posts/cilium',
    title: 'Kubernetes 홈랩에서 Cilium으로 갈아탄 이유',
  },
  {
    id: 'proxmox',
    href: '/posts/proxmox',
    title: 'Proxmox 클러스터 스토리지 설계',
  },
  {
    id: 'long',
    href: '/posts/long',
    title: 'A deliberately long archive title that wraps onto a second line instead of ending with an ellipsis',
  },
  {
    id: 'hnsw',
    href: '/posts/hnsw',
    title: 'pgvector HNSW 인덱스 튜닝 기록',
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

export const Default: Story = {};

export const WithDetail: Story = {
  args: {
    entries: entries.map((entry) => ({
      ...entry,
      detail: (
        <span className="line-clamp-2 text-body-md text-text-muted">
          Flannel로는 네트워크 정책을 걸 수 없었다. 노드 3대에서 eBPF 기반 데이터플레인으로 옮기며 바뀐 지연과 운영 비용을 정리한다.
        </span>
      ),
    })),
  },
};

export const WithMeta: Story = {
  args: {
    entries: entries.map((entry, index) => ({
      ...entry,
      meta: index % 2 === 0 ? `${91 - index * 9}% match` : undefined,
    })),
  },
};

function buildEntries(titles: string[]): ArchiveEntry[] {
  return titles.map((title) => ({ id: title, href: `/posts/${title}`, title }));
}

function delayOf(canvas: { getByRole: (role: 'link', options: { name: RegExp }) => HTMLElement }, title: string) {
  return canvas.getByRole('link', { name: new RegExp(title) }).closest('li')?.style.animationDelay;
}

/** 같은 ArchiveIndex에 다음 목록을 넘겨 rerender한다. */
function ChangingEntries({ first, next }: { first: ArchiveEntry[]; next: ArchiveEntry[] }) {
  const [shown, setShown] = useState(first);

  return (
    <>
      <button type="button" onClick={() => setShown(next)}>
        목록 바꾸기
      </button>
      <ArchiveIndex entries={shown} />
    </>
  );
}

export const FirstRowsStagger: Story = {
  name: '처음 보이는 행은 위에서부터 24ms 간격으로 나타난다',
  tags: ['!dev'],
  args: { entries: buildEntries(['첫째', '둘째', '셋째']) },
  play: async ({ canvas }) => {
    await expect([delayOf(canvas, '첫째'), delayOf(canvas, '둘째'), delayOf(canvas, '셋째')]).toEqual(['0ms', '24ms', '48ms']);
  },
};

export const AppendedRowsRestartStagger: Story = {
  name: '뒤에 붙은 행은 0ms부터 다시 세고, 이미 보인 행의 지연은 바꾸지 않는다',
  tags: ['!dev'],
  render: () => <ChangingEntries first={buildEntries(['첫째', '둘째'])} next={buildEntries(['첫째', '둘째', '셋째', '넷째'])} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '목록 바꾸기' }));

    await expect([delayOf(canvas, '첫째'), delayOf(canvas, '둘째'), delayOf(canvas, '셋째'), delayOf(canvas, '넷째')]).toEqual([
      '0ms',
      '24ms',
      '0ms',
      '24ms',
    ]);
  },
};

export const ReplacedListRestartsStagger: Story = {
  name: '목록이 통째로 바뀌면 새 목록을 0ms부터 센다',
  tags: ['!dev'],
  render: () => <ChangingEntries first={buildEntries(['첫째', '둘째'])} next={buildEntries(['검색1', '검색2'])} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '목록 바꾸기' }));

    await expect([delayOf(canvas, '검색1'), delayOf(canvas, '검색2')]).toEqual(['0ms', '24ms']);
  },
};
