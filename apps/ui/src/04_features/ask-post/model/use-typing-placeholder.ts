import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '@/shared/ui';

const TYPE_MS = 70;
const ERASE_MS = 28;
/** 다 쓴 문구를 읽을 시간이다. */
const HOLD_MS = 3500;
/** 다 지운 뒤 다음 문구를 쓰기 전까지 쉬는 시간이다. */
const GAP_MS = 700;

export interface TypingCursor {
  index: number;
  length: number;
  erasing: boolean;
}

/** 지금 자리에서 다음 자리로 가기까지 기다릴 시간과 다음 자리를 정한다. */
export function nextTypingStep(cursor: TypingCursor, phrases: readonly string[]): { delayMs: number; next: TypingCursor } {
  const full = phrases[cursor.index].length;

  if (cursor.erasing) {
    if (cursor.length === 0) {
      return { delayMs: GAP_MS, next: { index: (cursor.index + 1) % phrases.length, length: 0, erasing: false } };
    }

    return { delayMs: ERASE_MS, next: { ...cursor, length: cursor.length - 1 } };
  }

  if (cursor.length === full) {
    return { delayMs: HOLD_MS, next: { ...cursor, erasing: true } };
  }

  return { delayMs: TYPE_MS, next: { ...cursor, length: cursor.length + 1 } };
}

/**
 * 안내 문구 자리에 예시를 한 글자씩 쓰고 지운다. 첫 문구는 다 쓴 채로 시작한다.
 * `running`이 꺼지면 그 자리에서 멈춘다. 동작 줄이기가 켜져 있으면 첫 문구에 머문다.
 */
export function useTypingPlaceholder(phrases: readonly string[], running: boolean) {
  const [cursor, setCursor] = useState<TypingCursor>({ index: 0, length: phrases[0].length, erasing: false });

  useEffect(() => {
    if (!running || prefersReducedMotion()) return;

    const { delayMs, next } = nextTypingStep(cursor, phrases);
    const timer = window.setTimeout(() => setCursor(next), delayMs);
    return () => window.clearTimeout(timer);
  }, [cursor, phrases, running]);

  return phrases[cursor.index].slice(0, cursor.length);
}
