import { type CSSProperties } from 'react';

const FLAKE_COUNT = 46;

/** 렌더마다 자리가 바뀌지 않게 seed를 고정한 난수다. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

const random = seeded(42);
const FLAKES = Array.from({ length: FLAKE_COUNT }, () => {
  const duration = 14 + random() * 16;
  return {
    left: `${(random() * 100).toFixed(1)}%`,
    size: `${(1 + random() * 1.6).toFixed(1)}px`,
    opacity: 0.25 + random() * 0.35,
    duration: `${duration.toFixed(1)}s`,
    delay: `${(-random() * duration).toFixed(1)}s`,
    drift: `${Math.round((random() - 0.5) * 40)}px`,
    rest: `${Math.round(random() * 100)}%`,
  };
});

/**
 * 눈송이마다 터미널 높이만 한 세로 칸을 두고 칸을 아래로 민다.
 * 칸의 높이가 100%라 터미널 높이가 바뀌어도 눈이 끝까지 내려온다.
 * 동작 줄이기가 켜져 있으면 칸을 제자리에 흩어 둔다.
 */
export function Snowfall() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {FLAKES.map((flake) => (
        <span
          key={`${flake.left}-${flake.delay}`}
          className="absolute top-0 h-full animate-snowfall motion-reduce:animate-none motion-reduce:[translate:0_var(--snow-rest)]"
          style={
            {
              left: flake.left,
              opacity: flake.opacity,
              animationDuration: flake.duration,
              animationDelay: flake.delay,
              '--snow-drift': flake.drift,
              '--snow-rest': flake.rest,
            } as CSSProperties
          }
        >
          <span className="block rounded-full bg-white" style={{ width: flake.size, height: flake.size }} />
        </span>
      ))}
    </div>
  );
}
