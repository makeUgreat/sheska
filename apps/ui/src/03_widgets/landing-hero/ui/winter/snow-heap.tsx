import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { prefersReducedMotion } from '@/shared/ui';
import { seededRandom } from './seeded-random';
import { addSnow, emptyHeap, heapPath, type SnowHeap as Heap } from './snow-heap-shape';

/** SVG 안에서 창 윗변의 y. 쌓인 눈은 이 선 위로, 창 앞면 덮개는 이 선 아래로 그린다. */
const BASE = 22;
const FLAKE_COUNT = 40;

const random = seededRandom(7);
const FLAKES = Array.from({ length: FLAKE_COUNT }, () => {
  const duration = 2.7 + random() * 2.6;
  return {
    position: random(),
    drift: Math.round((random() - 0.5) * 24),
    size: `${(1.6 + random() * 2.2).toFixed(1)}px`,
    duration: `${duration.toFixed(1)}s`,
    delay: `${(-random() * duration).toFixed(1)}s`,
  };
});

/** 처음에는 3–4px로 시작한다. 동작 줄이기가 켜져 있으면 눈이 내리지 않으니 다 쌓인 채로 둔다. */
function seededHeap(width: number, full: boolean): Heap {
  const heap = emptyHeap(width);
  const next = seededRandom(11);
  const landings = Math.round((width / 2) * (full ? 40 : 1.2));
  for (let i = 0; i < landings; i++) addSnow(heap, next() * width, 0.5, 3 + next() * 4);

  return heap;
}

/**
 * 창 위 160px 안에서 눈송이가 내려 창 윗변에 닿으면 그 자리에 쌓인다.
 * 눈송이는 CSS 애니메이션으로 움직이고, 한 바퀴가 끝나는 순간이 창에 닿는 순간이다.
 */
export function SnowHeap({ falling }: { falling: boolean }) {
  const gradientId = useId();
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const heap = useRef<Heap | null>(null);
  const frame = useRef(0);

  function draw() {
    if (!heap.current) return;

    svg.current?.setAttribute('viewBox', `0 0 ${heap.current.width} ${BASE + 4}`);
    path.current?.setAttribute('d', heapPath(heap.current, BASE));
  }

  function land(position: number, drift: number) {
    if (!heap.current) return;

    addSnow(heap.current, position * heap.current.width + drift, 0.6, 3 + Math.random() * 4);
    frame.current ||= requestAnimationFrame(() => {
      frame.current = 0;
      draw();
    });
  }

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width === heap.current?.width) return;

      heap.current = seededHeap(width, prefersReducedMotion());
      draw();
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <>
      {falling && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-full h-40 motion-reduce:hidden">
          {FLAKES.map((flake) => (
            <span
              key={`${flake.position}`}
              className="absolute top-0 h-full animate-snowfall"
              style={
                {
                  left: `${(flake.position * 100).toFixed(2)}%`,
                  animationDuration: flake.duration,
                  animationDelay: flake.delay,
                  '--snow-drift': `${flake.drift}px`,
                } as CSSProperties
              }
              onAnimationIteration={() => land(flake.position, flake.drift)}
            >
              <span className="block rounded-full bg-snow-shade" style={{ width: flake.size, height: flake.size }} />
            </span>
          ))}
        </div>
      )}
      <svg
        ref={svg}
        aria-hidden="true"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-[-22px] h-[26px] w-full overflow-visible [filter:drop-shadow(0_0_0.5px_rgb(16_19_25/0.3))_drop-shadow(0_1px_1.5px_rgb(16_19_25/0.18))]"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--color-page-background)' }} />
            <stop offset="0.55" style={{ stopColor: 'var(--color-snow)' }} />
            <stop offset="1" style={{ stopColor: 'var(--color-snow-shade)' }} />
          </linearGradient>
        </defs>
        <path ref={path} fill={`url(#${gradientId})`} />
      </svg>
    </>
  );
}
