import { useEffect, useState } from 'react';

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** 0에서 목표 값까지 ease-out으로 올린다. 동작 줄이기가 켜져 있으면 바로 목표 값을 준다. */
export function useCountUp(target: number, durationMs: number) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      // rAF 시각은 프레임 시작 시각이라 start보다 이를 수 있다.
      const progress = Math.min(1, Math.max(0, (now - start) / durationMs));
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
