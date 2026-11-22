import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HttpError } from '@/shared/api';
import { type TerminalIo } from '../model/types';
import { printRequestFailure } from './request-failure';
import {
  TerminalCountUp,
  TerminalEntryLink,
  TerminalHighlight,
  TerminalMeter,
  TerminalText,
  TerminalTree,
  TerminalTreeRoot,
  type TerminalTreeItem,
} from './terminal-output';

const meta = {
  title: 'Shared/TerminalOutput',
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="max-w-container-terminal rounded-xl bg-surface p-4 font-mono text-display-terminal-mobile text-on-surface sm:p-6 sm:text-display-terminal">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

interface GrepHit {
  postId: string;
  title: string;
  date: string;
  snippet: string | null;
  similarity: number | null;
}

const GREP_HINT = (
  <>
    hint: type <kbd className="text-on-surface">cat</kbd> and press <kbd className="text-on-surface">Tab</kbd> to open one
  </>
);

function grepItem(hit: GrepHit, words: string[]): TerminalTreeItem {
  const details: ReactNode[] = [];
  if (hit.snippet) details.push(<TerminalHighlight text={hit.snippet} words={words} className="text-white" />);
  if (hit.similarity !== null) {
    details.push(
      <>
        similar in meaning <TerminalMeter percent={hit.similarity} />
      </>,
    );
  }

  return {
    key: hit.postId,
    head: <TerminalEntryLink title={hit.title} to={`/posts/${hit.postId}`} date={hit.date} highlight={words} />,
    details,
  };
}

function GrepOutput({ query, note, hits }: { query: string; note: string; hits: GrepHit[] }) {
  const words = query.split(' ');

  return (
    <TerminalTree
      root={<TerminalTreeRoot label={`"${query}"`} note={note} />}
      items={hits.map((hit) => grepItem(hit, words))}
      footer={GREP_HINT}
    />
  );
}

export const GrepResults: Story = {
  render: () => (
    <GrepOutput
      query="redis"
      note="3 matches"
      hits={[
        {
          postId: 'post-redis-session',
          title: 'Redis에 로그인 세션 저장하기',
          date: 'Nov 18',
          snippet: 'express-session 대신 Redis에 세션을 두면 pod가 늘어도 로그인이 풀리지 않는다.',
          similarity: 91,
        },
        {
          postId: 'post-rate-limit',
          title: 'API rate limit을 sliding window로 바꾼 이유',
          date: 'Oct 02',
          snippet: 'Redis sorted set에 요청 시각을 넣고 창 밖의 값을 지운다.',
          similarity: 37,
        },
        {
          postId: 'post-cache-redis',
          title: 'Redis cache invalidation 기록',
          date: 'Sep 14',
          snippet: null,
          similarity: null,
        },
      ]}
    />
  ),
};

export const GrepWrappedLines: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  render: () => (
    <GrepOutput
      query="kubernetes"
      note="first 10 matches"
      hits={[
        {
          postId: 'post-long-title',
          title: 'A deliberately long Kubernetes post title that wraps onto several lines in a narrow terminal',
          date: 'Nov 03',
          snippet:
            'Cilium replaced kube-proxy on the home Kubernetes cluster, so every Service now routes through eBPF instead of iptables rules that grew with each deployment.',
          similarity: 74,
        },
        {
          postId: 'post-last',
          title: 'Kubernetes 홈랩에서 Cilium으로 갈아탄 이유와 그 과정에서 겪은 네트워크 문제 정리',
          date: 'Aug 21',
          snippet: '마지막 항목에서는 세로선이 첫 줄 가운데에서 멈춘다. 접힌 줄이 여러 개여도 가지는 끊기지 않아야 한다.',
          similarity: null,
        },
      ]}
    />
  ),
};

const POST_ENTRIES = [
  { id: 'post-1', title: 'Redis에 로그인 세션 저장하기', date: 'Nov 18' },
  { id: 'post-2', title: 'Kubernetes 홈랩에서 Cilium으로 갈아탄 이유', date: 'Nov 03' },
  { id: 'post-3', title: 'API rate limit을 sliding window로 바꾼 이유', date: 'Oct 02' },
  { id: 'post-4', title: 'pgvector HNSW 인덱스 튜닝 기록', date: 'Sep 14' },
  { id: 'post-5', title: 'Proxmox 클러스터 스토리지 설계', date: 'Aug 21' },
];

export const ListPosts: Story = {
  render: () => (
    <TerminalTree
      root={<TerminalTreeRoot label="~/posts" note={<TerminalCountUp value={128} format={(count) => `${count} posts`} />} />}
      items={POST_ENTRIES.map((entry) => ({
        key: entry.id,
        head: <TerminalEntryLink title={entry.title} to={`/posts/${entry.id}`} date={entry.date} />,
      }))}
      footer="… 123 more · ls -a posts"
    />
  ),
};

export const FolderTree: Story = {
  render: () => (
    <TerminalTree
      root={<TerminalTreeRoot label="~" />}
      items={[
        { key: 'posts', head: <TerminalTreeRoot label="posts/" note="128 posts" /> },
        { key: 'sources', head: <TerminalTreeRoot label="sources/" note="342 notes" /> },
      ]}
    />
  ),
};

export const TextTones: Story = {
  render: () => (
    <>
      <TerminalText>plain: the default output line</TerminalText>
      <TerminalText tone="muted">no posts match &quot;missing&quot;</TerminalText>
      <TerminalText tone="error">ls: cannot open directory &apos;sources&apos;: Permission denied</TerminalText>
      <TerminalText tone="success">Welcome back. This browser stays logged in for 30 days.</TerminalText>
      <TerminalText tone="directory">posts/</TerminalText>
    </>
  ),
};

function printedFailures(failures: { commandName: string; error: unknown }[]) {
  const lines: ReactNode[] = [];
  const io: TerminalIo = {
    print: (line) => lines.push(line),
    clear: () => undefined,
    ask: () => Promise.resolve(''),
    progress: () => undefined,
    signal: new AbortController().signal,
  };
  failures.forEach(({ commandName, error }) => printRequestFailure(io, commandName, error));

  return lines;
}

export const RequestFailures: Story = {
  render: () => (
    <>
      {printedFailures([
        { commandName: 'cat', error: new HttpError(404, 'Not Found') },
        { commandName: 'grep', error: new TypeError('Failed to fetch') },
      ]).map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </>
  ),
};
