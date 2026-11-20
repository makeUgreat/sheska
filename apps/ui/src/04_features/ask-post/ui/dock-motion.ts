import { prefersReducedMotion } from '@/shared/ui';

export const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
export const EASE_IN = 'cubic-bezier(0.4, 0, 0.8, 0.2)';

/** 오른쪽 아래 접힌 버튼은 44px이고 화면 끝에서 24px 떨어져 있다. */
const CORNER_INSET = 24 + 22;

interface Motion {
  duration: number;
  easing: string;
  delay?: number;
  /** 나가는 움직임이다. 끝난 모양을 남겨 요소가 빠질 때까지 원래 모양으로 깜빡이지 않는다. */
  leave?: boolean;
}

/**
 * transform과 opacity만 움직인다. 두 속성은 compositor가 그려서 매 프레임 다시 그리지 않는다.
 * `animate`가 없는 환경(jsdom)이나 동작 줄이기가 켜져 있으면 움직이지 않고 바로 끝난다.
 */
export function play(node: HTMLElement | null, frames: Keyframe[], { duration, easing, delay = 0, leave = false }: Motion) {
  if (!node || typeof node.animate !== 'function' || prefersReducedMotion()) return Promise.resolve();

  const fill = leave ? 'forwards' : delay > 0 ? 'backwards' : 'none';
  return node.animate(frames, { duration, easing, delay, fill }).finished.then(
    () => undefined,
    () => undefined,
  );
}

/** 요소를 오른쪽 아래 접힌 버튼 자리로 옮기며 줄이는 transform이다. */
export function towardCorner(node: HTMLElement) {
  const box = node.getBoundingClientRect();
  const x = window.innerWidth - CORNER_INSET - (box.left + box.width / 2);
  const y = window.innerHeight - CORNER_INSET - (box.top + box.height / 2);

  return `translate(${x}px, ${y}px) scale(0.16)`;
}
