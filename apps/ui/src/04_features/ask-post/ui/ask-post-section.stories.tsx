import type { Meta, StoryObj } from '@storybook/react-vite';
import { type AskEntry } from '../model/use-ask-post';
import { AskPostSection } from './ask-post-section';

const headings = [
  { depth: 2, text: '데이터플레인 교체', id: 'dataplane' },
  { depth: 2, text: '측정', id: 'measure' },
];

const done: AskEntry = {
  id: 1,
  question: 'kube-proxy는 왜 껐어?',
  answer: 'Cilium이 Service 라우팅을 맡게 하려고 껐습니다. `kubeProxyReplacement: true`를 켜면 kube-proxy가 하던 일을 Cilium이 대신합니다.',
  status: 'done',
  sources: ['데이터플레인 교체'],
  failure: null,
};

const meta = {
  title: 'Features/Posts/AskPostSection',
  component: AskPostSection,
  args: {
    entries: [],
    busy: false,
    lockedSeconds: 0,
    headings,
    onAsk: () => undefined,
    onRetry: () => undefined,
    onClear: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-measure px-4 py-10">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AskPostSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Streaming: Story = {
  args: {
    busy: true,
    entries: [
      done,
      { id: 2, question: '메모리는 얼마나 더 써?', answer: 'cilium-agent가 노드마다', status: 'streaming', sources: [], failure: null },
    ],
  },
};

export const Waiting: Story = {
  args: {
    busy: true,
    entries: [{ id: 1, question: '메모리는 얼마나 더 써?', answer: '', status: 'streaming', sources: [], failure: null }],
  },
};

export const Answered: Story = {
  args: { entries: [done] },
};

export const Unreachable: Story = {
  args: {
    entries: [{ id: 1, question: '메모리는 얼마나 더 써?', answer: '', status: 'failed', sources: [], failure: { kind: 'unreachable' } }],
  },
};

export const CutOff: Story = {
  args: {
    entries: [
      {
        id: 1,
        question: '메모리는 얼마나 더 써?',
        answer: 'cilium-agent가 노드마다 약 180MiB를',
        status: 'failed',
        sources: [],
        failure: { kind: 'cut' },
      },
    ],
  },
};

export const RateLimited: Story = {
  args: {
    lockedSeconds: 42,
    entries: [{ id: 1, question: '메모리는 얼마나 더 써?', answer: '', status: 'failed', sources: [], failure: { kind: 'rate_limited' } }],
  },
};
