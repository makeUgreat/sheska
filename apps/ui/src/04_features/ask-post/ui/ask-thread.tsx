import { useLayoutEffect, useRef, useState, type RefObject, type UIEvent } from 'react';
import { type Heading } from '@/shared/lib';
import { AiMark, pinSectionOnClick } from '@/shared/ui';
import { type AskEntry, type AskFailure } from '../model/use-ask-post';
import { useThreadHeight } from '../model/use-thread-height';

const LINK =
  'text-text-secondary underline decoration-outline-variant/26 underline-offset-[3px] hover:text-accent-strong hover:decoration-current';

/** 맨 아래에서 이만큼 안이면 새 답이 길어질 때 맨 아래를 따라간다. */
const FOLLOW_DISTANCE = 40;
/** 맨 아래에서 이만큼 넘게 올라가면 맨 아래로 가는 버튼을 보인다. */
const JUMP_DISTANCE = 80;
/** 스크롤을 멈춘 뒤 스크롤바를 이만큼 더 보인다. */
const SCROLLBAR_LINGER_MS = 900;

/**
 * 스크롤바는 평소에 숨기고 카드에 마우스를 올리거나 스크롤하는 동안만 보인다.
 * 위로 넘친 대화가 있으면 위 가장자리를 흐려서 더 있다는 것을 알린다.
 */
const THREAD =
  'flex flex-col overflow-y-auto overscroll-contain px-4 pt-9 pb-1 [scrollbar-width:thin] [scrollbar-color:transparent_transparent] ' +
  'group-hover/card:[scrollbar-color:rgb(16_19_25/0.22)_transparent] data-[moving]:[scrollbar-color:rgb(16_19_25/0.22)_transparent] ' +
  'data-[scrolled]:[mask-image:linear-gradient(180deg,transparent_0,rgb(0_0_0/0.35)_28px,#000_72px)]';

export interface AskThreadProps {
  entries: AskEntry[];
  busy: boolean;
  headings: readonly Heading[];
  onRetry: (id: number) => void;
  onClear: () => void;
  cardRef: RefObject<HTMLDivElement>;
}

/**
 * 입력 칸 위에 붙어 위로 자라는 대화 카드다. 대화는 입력 칸 쪽(아래)에 붙는다.
 * 새 답은 맨 아래를 보고 있을 때만 따라간다. 위에서 앞의 답을 읽는 사람을 끌어내리지 않는다.
 */
export function AskThread({ entries, busy, headings, onRetry, onClear, cardRef }: AskThreadProps) {
  const thread = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const lingerTimer = useRef(0);
  const [scrolled, setScrolled] = useState(false);
  const [awayFromEnd, setAwayFromEnd] = useState(false);
  const [moving, setMoving] = useState(false);
  const { height, dragging, gripProps, minHeight, maxHeight } = useThreadHeight(
    () => thread.current?.getBoundingClientRect().height ?? minHeight,
  );

  useLayoutEffect(() => {
    const node = thread.current;
    if (!node || !following.current) return;

    node.scrollTop = node.scrollHeight;
  }, [entries, height]);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const node = event.currentTarget;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;

    following.current = distance < FOLLOW_DISTANCE;
    setScrolled(node.scrollTop > 4);
    setAwayFromEnd(distance > JUMP_DISTANCE);
    setMoving(true);
    window.clearTimeout(lingerTimer.current);
    lingerTimer.current = window.setTimeout(() => setMoving(false), SCROLLBAR_LINGER_MS);
  }

  function jumpToEnd() {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' });
  }

  return (
    <div
      ref={cardRef}
      className="group/card pointer-events-auto relative w-full origin-bottom overflow-hidden rounded-t-[10px] border border-b-0 border-outline-variant/15 bg-page-background shadow-[0_-8px_28px_-6px_rgb(16_19_25/0.12)]"
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="대화 창 높이 조절"
        aria-valuemin={minHeight}
        aria-valuemax={maxHeight}
        aria-valuenow={height ?? undefined}
        tabIndex={0}
        title="끌어서 높이 조절 · 두 번 눌러 되돌리기"
        {...gripProps}
        className={`absolute top-0 left-1/2 z-10 flex h-5 w-[72px] -translate-x-1/2 cursor-ns-resize touch-none items-center justify-center rounded-md before:h-1 before:rounded-full before:transition-[width,background-color] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${dragging ? 'before:w-11 before:bg-outline-variant/40' : 'before:w-8 before:bg-outline-variant/20 hover:before:w-11 hover:before:bg-outline-variant/40'}`}
      />

      <div
        ref={thread}
        role="log"
        aria-label="Questions and answers"
        onScroll={handleScroll}
        data-scrolled={scrolled || undefined}
        data-moving={moving || undefined}
        style={height === null ? undefined : { height }}
        className={`${THREAD} ${height === null ? 'max-h-[min(360px,46vh)]' : ''} ${entries.length === 0 ? 'min-h-min pb-4' : ''}`}
      >
        {entries.length === 0 ? (
          <EmptyThread />
        ) : (
          entries.map((entry, index) => (
            <AskTurn
              key={entry.id}
              entry={entry}
              headings={headings}
              last={index === entries.length - 1}
              busy={busy}
              onRetry={() => onRetry(entry.id)}
              onClear={onClear}
            />
          ))
        )}
      </div>

      {awayFromEnd && (
        <button
          type="button"
          onClick={jumpToEnd}
          className={`absolute bottom-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full border bg-page-background px-2.5 font-mono text-label-sm leading-6 tracking-normal shadow-[0_4px_12px_rgb(16_19_25/0.08)] transition-colors hover:border-accent hover:text-accent-strong ${busy ? 'border-accent text-accent-strong' : 'border-outline-variant/15 text-text-secondary'}`}
        >
          {busy ? '↓ 새 답' : '↓ 최신 답'}
        </button>
      )}
    </div>
  );
}

/** 첫 답이 들어설 자리와 같은 모양이다. 질문을 보내면 이 줄이 대화로 바뀐다. */
function EmptyThread() {
  return (
    <div className="mt-auto grid grid-cols-[24px_minmax(0,1fr)] items-start">
      <AiMark className="mt-1.5 text-accent" />
      <div>
        <p className="text-body-md leading-[28px] text-text-secondary">이 글을 바탕으로 답해 드려요.</p>
        <p className="mt-0.5 text-[14px] leading-[22px] text-text-muted">
          답변 아래{' '}
          <span className="ml-0.5 whitespace-nowrap font-mono text-label-sm tracking-normal text-text-secondary">
            <span aria-hidden="true" className="mr-1 text-accent">
              #
            </span>
            태그
          </span>
          를 누르면 참고한 부분으로 바로 이동해요.
        </p>
      </div>
    </div>
  );
}

function AskTurn({
  entry,
  headings,
  last,
  busy,
  onRetry,
  onClear,
}: {
  entry: AskEntry;
  headings: readonly Heading[];
  last: boolean;
  busy: boolean;
  onRetry: () => void;
  onClear: () => void;
}) {
  const streaming = entry.status === 'streaming';
  const answered = entry.answer !== '';
  const markTone = entry.failure ? (answered ? 'text-text-muted opacity-60' : 'invisible') : 'text-accent';
  const sources = entry.status === 'done' && <Sources sources={entry.sources} headings={headings} />;

  return (
    <div className="border-t border-dashed border-outline-variant/15 py-3.5 first:mt-auto first:border-t-0 first:pt-0 last:pb-1.5">
      <p className="break-words text-body-md font-semibold leading-[28px] text-text-primary">{entry.question}</p>
      <div className="grid grid-cols-[24px_minmax(0,1fr)] items-start">
        <AiMark twinkling={streaming} className={`mt-1.5 ${markTone}`} />
        <div className="grid min-w-0 gap-1.5" aria-busy={streaming}>
          {answered ? (
            <AnswerText text={entry.answer} />
          ) : (
            streaming && <p className="font-mono text-label-sm leading-[28px] tracking-normal text-text-muted">reading this post…</p>
          )}
          {entry.failure && <FailureLine failure={entry.failure} onRetry={onRetry} />}
          {last && !busy ? (
            <div className="flex min-h-7 items-center justify-between gap-2">
              {sources || <span />}
              <button
                type="button"
                onClick={onClear}
                aria-label="대화 지우기"
                title="대화 지우기"
                className="-mr-2 flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <EraserIcon />
              </button>
            </div>
          ) : (
            sources
          )}
        </div>
      </div>
    </div>
  );
}

function EraserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  );
}

/** AI가 쓴 글이라 vault 기호를 붙이는 Markdown 렌더러를 쓰지 않는다. inline code만 살린다. */
function AnswerText({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-body-prose text-text-secondary">
      {text.split(/(`[^`\n]+`)/).map((part, index) =>
        part.length > 2 && part.startsWith('`') && part.endsWith('`') ? (
          <code key={index} className="mx-0.5 font-mono text-[0.875em] text-accent-strong">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </p>
  );
}

/**
 * 근거 링크를 누르면 그 절로 가면서 본문의 섹션 강조를 고정한다. 제목을 누른 것과 같은 모양이다.
 * heading 글자가 본문 heading에 없으면 링크 없이 글자만 둔다.
 */
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
          <a key={text} href={`#${id}`} {...pinSectionOnClick(id)} className={LINK}>
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
      <span aria-hidden="true" className="absolute top-0 -left-6 w-4 text-center text-code-snippet leading-[28px] text-accent-strong">
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
