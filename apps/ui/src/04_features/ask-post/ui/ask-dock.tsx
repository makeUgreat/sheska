import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { type Heading } from '@/shared/lib';
import { AiMark } from '@/shared/ui';
import { type AskEntry } from '../model/use-ask-post';
import { AskField } from './ask-field';
import { AskThread } from './ask-thread';
import { EASE_IN, EASE_OUT, play, towardCorner } from './dock-motion';
import { MinimizeButton } from './minimize-button';

export type DockMode = 'pill' | 'open' | 'mini';

/** 이만큼 넘게 움직인 click은 끌기로 보고 접지 않는다. */
const DRAG_TOLERANCE = 4;

interface Parts {
  pill: RefObject<HTMLDivElement>;
  card: RefObject<HTMLDivElement>;
  field: RefObject<HTMLFormElement>;
  mini: RefObject<HTMLButtonElement>;
}

/** 지금 모양을 내보낸다. 펼친 모양은 카드가 먼저 입력 칸으로 접히고 입력 칸이 뒤따른다. */
function leave(parts: Parts, from: DockMode, to: DockMode) {
  if (to === 'mini') {
    const nodes = from === 'open' ? [parts.card.current, parts.field.current] : [parts.pill.current];
    return Promise.all(
      nodes
        .filter((node) => node !== null)
        .map((node) =>
          play(
            node,
            [
              { opacity: 1, transform: 'none' },
              { opacity: 0, transform: towardCorner(node) },
            ],
            { duration: 240, easing: EASE_IN, leave: true },
          ),
        ),
    );
  }

  if (from === 'open') {
    return Promise.all([
      play(
        parts.card.current,
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(10px) scaleY(0.92)' },
        ],
        {
          duration: 120,
          easing: EASE_IN,
          leave: true,
        },
      ),
      play(
        parts.field.current,
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'scaleX(0.7)' },
        ],
        {
          duration: 120,
          easing: EASE_IN,
          delay: 70,
          leave: true,
        },
      ),
    ]);
  }

  if (from === 'mini') {
    return play(
      parts.mini.current,
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'scale(0.7)' },
      ],
      { duration: 120, easing: EASE_IN, leave: true },
    );
  }

  return play(
    parts.pill.current,
    [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: 'scaleX(1.08) scaleY(0.92)' },
    ],
    {
      duration: 80,
      easing: EASE_IN,
      leave: true,
    },
  );
}

/** 새 모양을 들인다. 펼칠 때는 입력 칸이 먼저 넓어지고, 거의 다 넓어졌을 때 카드가 위로 열린다. */
function enter(parts: Parts, from: DockMode, to: DockMode) {
  if (to === 'mini') {
    return play(
      parts.mini.current,
      [
        { opacity: 0, transform: 'scale(0.5)' },
        { opacity: 1, transform: 'scale(1.06)', offset: 0.7 },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 220, easing: EASE_OUT },
    );
  }

  if (to === 'open') {
    const field = parts.field.current;
    const fieldDuration = from === 'mini' ? 220 : 140;
    const fieldFrom = from === 'mini' && field ? towardCorner(field) : 'scaleX(0.7)';

    return Promise.all([
      play(
        field,
        [
          { opacity: 0, transform: fieldFrom },
          { opacity: 1, transform: 'none' },
        ],
        { duration: fieldDuration, easing: EASE_OUT },
      ),
      play(
        parts.card.current,
        [
          { opacity: 0, transform: 'translateY(10px) scaleY(0.92)' },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration: 170,
          easing: EASE_OUT,
          delay: fieldDuration - 40,
        },
      ),
    ]);
  }

  return play(
    parts.pill.current,
    [
      { opacity: 0, transform: 'translateY(8px) scale(0.94)' },
      { opacity: 1, transform: 'none' },
    ],
    {
      duration: 160,
      easing: EASE_OUT,
    },
  );
}

export interface AskDockProps {
  entries: AskEntry[];
  busy: boolean;
  lockedSeconds: number;
  headings: readonly Heading[];
  onAsk: (question: string) => void;
  onRetry: (id: number) => void;
  onClear: () => void;
  initialMode?: DockMode;
}

/**
 * 화면 아래 가운데에 떠 있는 질문 줄이다. 대화가 길어져도 글 머리가 자라지 않게 본문 밖에 둔다.
 * 알약을 누르면 입력 칸과 그 위의 대화 카드로 펼치고, 카드 밖을 누르거나 Esc를 누르면 알약으로 접는다.
 * 접기 버튼은 오른쪽 아래의 작은 버튼으로 완전히 접는다.
 * 펼친 카드는 modal이 아니다. 본문 스크롤과 click을 막지 않는다.
 */
export function AskDock({ entries, busy, lockedSeconds, headings, onAsk, onRetry, onClear, initialMode = 'pill' }: AskDockProps) {
  const [mode, setMode] = useState<DockMode>(initialMode);
  const doneCount = entries.filter((entry) => entry.status === 'done').length;
  const [seenDone, setSeenDone] = useState(doneCount);
  const dock = useRef<HTMLElement>(null);
  const pillButton = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const parts: Parts = {
    pill: useRef<HTMLDivElement>(null),
    card: useRef<HTMLDivElement>(null),
    field: useRef<HTMLFormElement>(null),
    mini: useRef<HTMLButtonElement>(null),
  };
  const moving = useRef(false);
  const arrival = useRef<{ from: DockMode; focusPill: boolean } | null>(null);
  const accepting = !busy && lockedSeconds === 0;
  const unseen = mode !== 'open' && doneCount > seenDone;

  function go(to: DockMode, focusPill = false) {
    if (moving.current || to === mode) return;

    moving.current = true;
    if (mode === 'open') setSeenDone(doneCount);
    void leave(parts, mode, to).then(() => {
      arrival.current = { from: mode, focusPill };
      setMode(to);
    });
  }

  useLayoutEffect(() => {
    const came = arrival.current;
    if (!came) return;

    arrival.current = null;
    if (mode === 'open') input.current?.focus({ preventScroll: true });
    if (mode === 'mini') parts.mini.current?.focus({ preventScroll: true });
    if (mode === 'pill' && came.focusPill) pillButton.current?.focus({ preventScroll: true });
    if (mode === 'pill' && !came.focusPill && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }

    void enter(parts, came.from, mode).then(() => {
      moving.current = false;
    });
  });

  useEffect(() => {
    if (mode !== 'open') return;

    let down: { x: number; y: number; inside: boolean } | null = null;
    const isInside = (target: EventTarget | null) => target instanceof Node && (dock.current?.contains(target) ?? false);

    const onPointerDown = (event: PointerEvent) => {
      down = { x: event.clientX, y: event.clientY, inside: isInside(event.target) };
    };

    /** 글자를 드래그해 선택한 동작도 click으로 끝난다. 인용하려고 고른 글자를 잃지 않게 접지 않는다. */
    const onClick = (event: MouseEvent) => {
      if (down?.inside || isInside(event.target)) return;

      const dragged = down !== null && Math.hypot(event.clientX - down.x, event.clientY - down.y) > DRAG_TOLERANCE;
      if (dragged || window.getSelection()?.isCollapsed === false) return;

      go('pill');
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      go('pill', true);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  });

  return (
    <>
      <section
        ref={dock}
        aria-label="Ask about this post"
        className={`pointer-events-none fixed bottom-[calc(24px+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 flex-col items-center ${mode === 'open' ? 'w-[min(680px,calc(100vw-32px))]' : 'max-w-[calc(100vw-32px)]'}`}
      >
        {mode === 'pill' && (
          <div
            ref={parts.pill}
            className="pointer-events-auto flex h-11 max-w-full origin-bottom items-center rounded-full border border-outline-variant/15 bg-page-background pr-1 shadow-[0_8px_28px_rgb(16_19_25/0.1),0_1px_2px_rgb(16_19_25/0.06)]"
          >
            <button
              ref={pillButton}
              type="button"
              aria-expanded={false}
              onClick={() => go('open')}
              className="group/entry flex h-full min-w-0 items-center gap-2.5 rounded-full pr-2.5 pl-3.5 text-body-md text-text-secondary transition-colors hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <AiMark twinkling={busy} className="text-accent" />
              질문하기
            </button>
            <span aria-hidden="true" className="h-[18px] w-px shrink-0 bg-outline-variant/15" />
            <MinimizeButton onClick={() => go('mini')} />
          </div>
        )}

        {mode === 'open' && (
          <>
            <AskThread entries={entries} busy={busy} headings={headings} onRetry={onRetry} onClear={onClear} cardRef={parts.card} />
            <AskField
              accepting={accepting}
              lockedSeconds={lockedSeconds}
              hasEntries={entries.length > 0}
              onAsk={onAsk}
              onMinimize={() => go('mini')}
              fieldRef={parts.field}
              inputRef={input}
            />
          </>
        )}
      </section>

      {mode === 'mini' && (
        <button
          ref={parts.mini}
          type="button"
          onClick={() => go('open')}
          aria-label={`질문 열기, 질문 ${entries.length}개`}
          className="group/entry fixed right-[calc(24px+env(safe-area-inset-right))] bottom-[calc(24px+env(safe-area-inset-bottom))] z-40 flex size-11 items-center justify-center rounded-full border border-outline-variant/15 bg-page-background/90 shadow-[0_8px_28px_rgb(16_19_25/0.1),0_1px_2px_rgb(16_19_25/0.06)] backdrop-blur-sm transition-shadow hover:shadow-[0_8px_28px_rgb(16_19_25/0.1),0_0_0_4px_var(--color-accent-tint)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent [&_svg]:size-5"
        >
          <AiMark twinkling={busy} className="text-accent" />
          {unseen && (
            <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-accent ring-2 ring-page-background" />
          )}
        </button>
      )}
    </>
  );
}
