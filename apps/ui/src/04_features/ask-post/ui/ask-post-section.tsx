import { useId, useState, type FormEvent } from 'react';
import { type Heading } from '@/shared/lib';
import { AiMark } from '@/shared/ui';
import { type AskEntry, type AskFailure } from '../model/use-ask-post';
import { useTypingPlaceholder } from '../model/use-typing-placeholder';

const ASK_LABEL = '이 글에 대해 질문하기';
const EXAMPLE_QUESTIONS = ['이 글의 핵심만 알려 줘', '왜 이렇게 했어?', '다음에 할 일은 뭐야?'];
const PLACEHOLDER_PHRASES = [ASK_LABEL, ...EXAMPLE_QUESTIONS];

const LINK =
  'text-text-secondary underline decoration-outline-variant/26 underline-offset-[3px] hover:text-accent-strong hover:decoration-current';

export interface AskPostSectionProps {
  entries: AskEntry[];
  busy: boolean;
  lockedSeconds: number;
  headings: readonly Heading[];
  onAsk: (question: string) => void;
  onRetry: (id: number) => void;
  onClear: () => void;
}

/**
 * 질문 줄은 답을 받는 동안 사라지고, 답이 끝나면 마지막 답 아래에 다시 나타난다.
 * 답이 질문 줄이 있던 자리에서 나오므로 기다리는 표시는 답 앞의 AI 아이콘이 맡는다.
 */
export function AskPostSection({ entries, busy, lockedSeconds, headings, onAsk, onRetry, onClear }: AskPostSectionProps) {
  return (
    <section aria-label="Ask about this post" className="mt-3">
      {entries.length > 0 && (
        <div className="mt-3.5 flex items-center justify-between font-mono text-label-sm tracking-normal text-text-muted">
          <span>질문 {entries.length}개</span>
          <button type="button" onClick={onClear} className="uppercase tracking-[0.1em] transition-colors hover:text-accent-strong">
            Clear
          </button>
        </div>
      )}

      {entries.map((entry) => (
        <AskEntryView key={entry.id} entry={entry} headings={headings} onRetry={() => onRetry(entry.id)} />
      ))}

      {!busy && (
        <>
          <AskRow lockedSeconds={lockedSeconds} onAsk={onAsk} afterEntries={entries.length > 0} />
          {entries.length === 0 && <ExampleQuestions onAsk={onAsk} />}
        </>
      )}
    </section>
  );
}

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * 선도 상자도 없는 프롬프트 줄이다. 밑줄을 두면 바로 아래 본문 구분선과 헷갈린다.
 * 안내 문구는 native placeholder가 아니라 따로 그린다. 예시를 한 글자씩 쓰는 동안 얇은 커서를 붙인다.
 */
function AskRow({
  lockedSeconds,
  onAsk,
  afterEntries,
}: {
  lockedSeconds: number;
  onAsk: (question: string) => void;
  afterEntries: boolean;
}) {
  const inputId = useId();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const locked = lockedSeconds > 0;
  const showHint = value === '' && !focused;
  const placeholder = useTypingPlaceholder(PLACEHOLDER_PHRASES, showHint && !locked);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!value.trim()) return;

    onAsk(value);
    setValue('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1 py-1.5 ${afterEntries ? '' : 'mt-3'}`}
    >
      <label htmlFor={inputId} className="grid min-w-0 cursor-text grid-cols-[20px_minmax(0,1fr)] items-center">
        <span
          aria-hidden="true"
          className={`font-mono text-body-md font-medium transition-colors ${locked ? 'text-text-muted' : 'text-accent group-hover:text-accent-strong group-focus-within:text-accent-strong'}`}
        >
          ?
        </span>
        <span className="relative min-w-0">
          <input
            id={inputId}
            type="text"
            autoComplete="off"
            aria-label={ASK_LABEL}
            value={value}
            disabled={locked}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full border-0 bg-transparent py-1 text-body-md text-text-primary caret-accent outline-none disabled:cursor-not-allowed"
          />
          {showHint && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 flex max-w-full items-center overflow-hidden whitespace-nowrap text-text-muted"
            >
              {locked ? (
                <span className="font-mono text-label-sm tracking-normal">You can ask again in {formatCountdown(lockedSeconds)}</span>
              ) : (
                <>
                  <span className="text-body-md">{placeholder}</span>
                  <span className="ml-0.5 h-[17px] w-px shrink-0 bg-accent" />
                </>
              )}
            </span>
          )}
        </span>
      </label>
      <button
        type="submit"
        disabled={locked}
        className="px-1 py-1.5 font-mono text-label-sm uppercase text-text-muted opacity-0 transition-opacity group-focus-within:opacity-100 hover:text-accent-strong focus-visible:opacity-100 disabled:cursor-not-allowed"
      >
        Ask ↵
      </button>
    </form>
  );
}

function ExampleQuestions({ onAsk }: { onAsk: (question: string) => void }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 pl-5">
      {EXAMPLE_QUESTIONS.map((question) => (
        <li key={question}>
          <button
            type="button"
            onClick={() => onAsk(question)}
            className="text-left text-body-md text-text-muted transition-colors hover:text-accent-strong"
          >
            <span aria-hidden="true" className="font-mono">
              →{' '}
            </span>
            {question}
          </button>
        </li>
      ))}
    </ul>
  );
}

function AskEntryView({ entry, headings, onRetry }: { entry: AskEntry; headings: readonly Heading[]; onRetry: () => void }) {
  const streaming = entry.status === 'streaming';
  const answered = entry.answer !== '';
  const markTone = entry.failure ? (answered ? 'text-text-muted opacity-60' : 'invisible') : 'text-accent';

  return (
    <div className="grid gap-2 border-b border-outline-variant/12 py-4 last-of-type:border-b-0">
      <p className="break-words pl-5 text-body-md font-semibold text-text-primary">{entry.question}</p>
      <div className="grid grid-cols-[20px_minmax(0,1fr)] items-start">
        <AiMark twinkling={streaming} className={`mt-1.5 -ml-0.5 ${markTone}`} />
        <div className="grid min-w-0 gap-1.5" aria-busy={streaming}>
          {answered ? (
            <AnswerText text={entry.answer} />
          ) : (
            streaming && <p className="font-mono text-label-sm leading-[28px] tracking-normal text-text-muted">reading this post…</p>
          )}
          {entry.status === 'done' && <Sources sources={entry.sources} headings={headings} />}
          {entry.failure && <FailureLine failure={entry.failure} onRetry={onRetry} />}
        </div>
      </div>
    </div>
  );
}

/** AI가 쓴 글이라 vault 기호를 붙이는 Markdown 렌더러를 쓰지 않는다. inline code만 살린다. */
function AnswerText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-body-prose text-text-secondary">
      {text.split(/(`[^`\n]+`)/).map((part, index) =>
        part.length > 2 && part.startsWith('`') && part.endsWith('`') ? (
          <code key={index} className="mx-0.5 font-mono text-code-snippet text-accent-strong">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </p>
  );
}

/** heading 글자가 본문 목차에 없으면 링크 없이 글자만 둔다. */
function Sources({ sources, headings }: { sources: string[]; headings: readonly Heading[] }) {
  if (sources.length === 0) return null;

  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-label-sm tracking-normal text-text-muted">
      {sources.map((text) => {
        const id = headings.find((heading) => heading.text === text)?.id;
        const mark = (
          <span aria-hidden="true" className="mr-1 text-accent">
            #
          </span>
        );

        return id ? (
          <a key={text} href={`#${id}`} className={LINK}>
            {mark}
            {text}
          </a>
        ) : (
          <span key={text}>
            {mark}
            {text}
          </span>
        );
      })}
    </p>
  );
}

function describeFailure(failure: AskFailure) {
  switch (failure.kind) {
    case 'unreachable':
      return { label: 'Error', message: 'The server could not be reached.', retry: true };
    case 'failed':
      return {
        label: failure.status === null ? 'Error' : String(failure.status),
        message: 'Something went wrong while answering.',
        retry: true,
      };
    case 'cut':
      return { label: 'Error', message: 'The answer stopped partway.', retry: true };
    case 'rate_limited':
      return { label: '429', message: 'Too many questions. Try again in a moment.', retry: false };
  }
}

/**
 * 한 줄 로그다. 줄 높이 28px은 답 첫 줄과 같아서 줄 가운데가 AI 아이콘 가운데와 맞는다.
 * `✕`는 아이콘 열에 걸어 아이콘과 같은 가로 가운데에 세운다. 답이 없으면 아이콘을 숨기고 `✕`가 그 자리에 선다.
 */
function FailureLine({ failure, onRetry }: { failure: AskFailure; onRetry: () => void }) {
  const { label, message, retry } = describeFailure(failure);

  return (
    <p
      role="alert"
      className="relative flex flex-wrap items-center gap-x-2 font-mono text-label-sm leading-[28px] tracking-normal text-text-muted"
    >
      <span aria-hidden="true" className="absolute top-0 -left-[22px] w-4 text-center text-code-snippet leading-[28px] text-accent-strong">
        ✕
      </span>
      <span className="uppercase tracking-[0.1em] text-accent-strong">{label}</span>
      <span>{message}</span>
      {retry && (
        <button type="button" onClick={onRetry} className={LINK}>
          Retry ↻
        </button>
      )}
    </p>
  );
}
