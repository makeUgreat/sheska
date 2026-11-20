import type { Meta, StoryObj } from '@storybook/react-vite';
import { type AskEntry } from '../model/use-ask-post';
import { AskDock } from './ask-dock';

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
  title: 'Features/Posts/AskDock',
  component: AskDock,
  args: {
    entries: [],
    busy: false,
    lockedSeconds: 0,
    headings,
    initialMode: 'open',
    onAsk: () => undefined,
    onRetry: () => undefined,
    onClear: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="min-h-[720px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AskDock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Collapsed: Story = { args: { initialMode: 'pill' } };

export const Minimized: Story = { args: { initialMode: 'mini', entries: [done] } };

export const Empty: Story = {};

export const Answered: Story = { args: { entries: [done] } };

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

export const LongThread: Story = {
  args: {
    entries: Array.from({ length: 8 }, (_, index) => ({
      ...done,
      id: index + 1,
      question: `${index + 1}번째 질문: kube-proxy는 왜 껐어?`,
    })),
  },
};

export const Failed: Story = {
  args: {
    entries: [
      done,
      { id: 2, question: '측정은 어떻게 했어?', answer: '', status: 'failed', sources: [], failure: { kind: 'unreachable' } },
    ],
  },
};

export const RateLimited: Story = {
  args: {
    lockedSeconds: 42,
    entries: [done, { id: 2, question: '하나 더 물어볼게', answer: '', status: 'failed', sources: [], failure: { kind: 'rate_limited' } }],
  },
};
