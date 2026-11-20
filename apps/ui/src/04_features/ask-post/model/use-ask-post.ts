import { useEffect, useRef, useState } from 'react';
import { PostErrorCode } from '@sheska/contract';
import { askAboutPost, type AskPostRequest } from '@/entities/post';
import { HttpError, useHttpClient } from '@/shared/api';

/** 서버가 받는 history 상한과 같다. */
const HISTORY_LIMIT = 10;

/** 429 응답에 기다릴 시간이 없을 때 쓴다. */
const DEFAULT_RETRY_AFTER_SECONDS = 60;

export type AskFailure =
  /** 서버에 닿지 못했다. */
  | { kind: 'unreachable' }
  /** 서버가 답을 시작하지 못했다. HTTP 오류면 `status`가 있다. */
  | { kind: 'failed'; status: number | null }
  /** 답을 받다가 끊겼다. 받은 답은 남긴다. */
  | { kind: 'cut' }
  | { kind: 'rate_limited' };

export interface AskEntry {
  id: number;
  question: string;
  answer: string;
  status: 'streaming' | 'done' | 'failed';
  /** 답의 근거가 된 본문 heading의 글자다. */
  sources: string[];
  failure: AskFailure | null;
}

type History = NonNullable<AskPostRequest['history']>;

function historyBefore(entries: AskEntry[], id?: number): History {
  const end = id === undefined ? entries.length : entries.findIndex((entry) => entry.id === id);

  return entries
    .slice(0, end)
    .filter((entry) => entry.status === 'done')
    .slice(-HISTORY_LIMIT)
    .map(({ question, answer }) => ({ question, answer }));
}

function failureOf(error: unknown, answered: boolean): AskFailure {
  if (answered) return { kind: 'cut' };
  if (error instanceof HttpError) return { kind: 'failed', status: error.status };
  return { kind: 'unreachable' };
}

function retryAfterSeconds(error: HttpError) {
  const seconds = error.details.retryAfterSeconds;
  return typeof seconds === 'number' && seconds > 0 ? Math.ceil(seconds) : DEFAULT_RETRY_AFTER_SECONDS;
}

/**
 * 한 post에 대한 질문과 답을 화면에만 둔다. 서버는 대화를 저장하지 않는다.
 * 답은 한 번에 하나만 받는다. 답을 받는 동안에는 새 질문과 다시 시도를 받지 않는다.
 */
export function useAskPost(postId: string) {
  const http = useHttpClient();
  const [entries, setEntries] = useState<AskEntry[]>([]);
  const [lockedSeconds, setLockedSeconds] = useState(0);
  const nextId = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  const busy = entries.some((entry) => entry.status === 'streaming');
  const accepting = !busy && lockedSeconds === 0;

  useEffect(() => () => inFlight.current?.abort(), []);

  useEffect(() => {
    if (lockedSeconds === 0) return;

    const timer = window.setTimeout(() => setLockedSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [lockedSeconds]);

  function update(id: number, change: (entry: AskEntry) => AskEntry) {
    setEntries((list) => list.map((entry) => (entry.id === id ? change(entry) : entry)));
  }

  function fail(id: number, failure: AskFailure) {
    update(id, (entry) => ({ ...entry, status: 'failed', failure }));
  }

  async function stream(id: number, question: string, history: History) {
    const controller = new AbortController();
    inFlight.current = controller;
    let answered = false;

    try {
      for await (const event of askAboutPost(http, postId, { question, history }, controller.signal)) {
        switch (event.type) {
          case 'delta':
            answered = true;
            update(id, (entry) => ({ ...entry, answer: entry.answer + event.text }));
            break;
          case 'done':
            update(id, (entry) => ({ ...entry, status: 'done', sources: event.sources }));
            return;
          case 'error':
            fail(id, answered ? { kind: 'cut' } : { kind: 'failed', status: null });
            return;
        }
      }

      fail(id, answered ? { kind: 'cut' } : { kind: 'failed', status: null });
    } catch (error) {
      if (controller.signal.aborted) return;

      if (error instanceof HttpError && error.code === PostErrorCode.QUESTION_RATE_LIMITED) {
        setLockedSeconds(retryAfterSeconds(error));
        fail(id, { kind: 'rate_limited' });
        return;
      }

      fail(id, failureOf(error, answered));
    }
  }

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || !accepting) return;

    const id = nextId.current++;
    const history = historyBefore(entries);
    setEntries((list) => [...list, { id, question: trimmed, answer: '', status: 'streaming', sources: [], failure: null }]);
    void stream(id, trimmed, history);
  }

  /** 실패한 답을 같은 자리에서 처음부터 다시 받는다. */
  function retry(id: number) {
    const entry = entries.find((item) => item.id === id);
    if (!entry || !accepting) return;

    const history = historyBefore(entries, id);
    update(id, (item) => ({ ...item, answer: '', status: 'streaming', sources: [], failure: null }));
    void stream(id, entry.question, history);
  }

  function clear() {
    inFlight.current?.abort();
    setEntries([]);
  }

  return { entries, busy, lockedSeconds, ask, retry, clear };
}
