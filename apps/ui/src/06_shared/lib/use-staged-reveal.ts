import { useEffect, useRef, useState } from 'react';

export type RevealPhase = 'holding' | 'revealing' | 'shown';

const revealedKeys = new Set<string>();

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 이미 받은 내용도 방금 만든 것처럼 잠깐 붙잡았다가 드러낸다. 붙잡는 시간은 `ref`를 단 요소가 화면에 들어온 뒤부터 센다.
 * 같은 `key`는 페이지를 새로 불러오기 전까지 한 번만 연출한다. 다시 보면 같은 내용을 또 만드는 것처럼 보이기 때문이다.
 * `ready`가 아니던 내용이 `ready`가 되면 붙잡지 않고 바로 드러낸다. 그 사이에 실제로 만들어진 것이다.
 */
export function useStagedReveal(key: string, { ready, holdMs, jitterMs = 0 }: { ready: boolean; holdMs: number; jitterMs?: number }) {
  const [phase, setPhase] = useState<RevealPhase>(() => (revealedKeys.has(key) || prefersReducedMotion() ? 'shown' : 'holding'));
  const [node, setNode] = useState<Element | null>(null);
  const wasPending = useRef(!ready);

  useEffect(() => {
    if (!ready || phase !== 'holding') return;

    const reveal = () => {
      revealedKeys.add(key);
      setPhase('revealing');
    };

    if (wasPending.current) {
      reveal();
      return;
    }

    if (!node) return;

    let timer: number | undefined;
    const hold = () => {
      timer = window.setTimeout(reveal, holdMs + Math.random() * jitterMs);
    };

    if (typeof IntersectionObserver === 'undefined') {
      hold();
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;

      observer.disconnect();
      hold();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [ready, phase, node, key, holdMs, jitterMs]);

  return { ref: setNode, phase };
}
