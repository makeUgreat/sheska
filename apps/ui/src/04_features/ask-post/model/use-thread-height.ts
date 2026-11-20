import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

const STORAGE_KEY = 'sheska.ask.thread-height';
/** 빈 대화 카드의 안내 문구가 한 줄씩 들어가는 높이다. 문구가 줄바꿈되면 대화 창이 `min-content`로 더 늘어난다. */
const MIN_HEIGHT = 104;
/** 대화 창이 본문을 다 덮지 않게 화면 높이의 이 비율에서 멈춘다. */
const MAX_VIEWPORT_SHARE = 0.7;
const KEY_STEP = 24;
const KEY_STEP_LARGE = 96;

function ceilingHeight() {
  return Math.round(window.innerHeight * MAX_VIEWPORT_SHARE);
}

function clampHeight(height: number) {
  return Math.max(MIN_HEIGHT, Math.min(ceilingHeight(), Math.round(height)));
}

function readSaved(): number | null {
  try {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    return saved > 0 ? clampHeight(saved) : null;
  } catch {
    return null;
  }
}

/** 저장소를 쓸 수 없으면 이번 화면에서만 기억한다. */
function save(height: number | null) {
  try {
    if (height === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, String(height));
  } catch {
    return;
  }
}

/**
 * 손잡이로 대화 창 높이를 정한다. 정한 높이는 대화 길이와 상관없이 지키고, 다음에 열 때도 쓴다.
 * 정하지 않았으면 `null`이다. 그때 대화 창은 내용 높이를 따라가다 기본 상한에서 멈춘다.
 * `measure`는 끌기를 시작할 때 지금 대화 창의 높이를 잰다.
 */
export function useThreadHeight(measure: () => number) {
  const [height, setHeight] = useState<number | null>(readSaved);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ y: number; from: number; latest: number } | null>(null);
  const fixed = height !== null;

  useEffect(() => {
    if (!fixed) return;

    const onResize = () => setHeight((value) => (value === null ? null : clampHeight(value)));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fixed]);

  useEffect(() => {
    if (!dragging) return;

    const { style } = document.body;
    const previous = { cursor: style.cursor, userSelect: style.userSelect };
    style.cursor = 'ns-resize';
    style.userSelect = 'none';
    return () => {
      style.cursor = previous.cursor;
      style.userSelect = previous.userSelect;
    };
  }, [dragging]);

  function commit(next: number | null) {
    setHeight(next);
    save(next);
  }

  function endDrag() {
    if (!drag.current) return;

    save(drag.current.latest);
    drag.current = null;
    setDragging(false);
  }

  function step(delta: number) {
    commit(clampHeight((height ?? measure()) + delta));
  }

  const gripProps = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      event.preventDefault();
      const from = measure();
      drag.current = { y: event.clientY, from, latest: from };
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (!drag.current) return;

      const next = clampHeight(drag.current.from + drag.current.y - event.clientY);
      drag.current.latest = next;
      setHeight(next);
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onDoubleClick() {
      commit(null);
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      const delta = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;

      switch (event.key) {
        case 'ArrowUp':
          step(delta);
          break;
        case 'ArrowDown':
          step(-delta);
          break;
        case 'Home':
          commit(MIN_HEIGHT);
          break;
        case 'End':
          commit(ceilingHeight());
          break;
        case 'Enter':
          commit(null);
          break;
        default:
          return;
      }

      event.preventDefault();
    },
  };

  return { height, dragging, gripProps, minHeight: MIN_HEIGHT, maxHeight: ceilingHeight() };
}
