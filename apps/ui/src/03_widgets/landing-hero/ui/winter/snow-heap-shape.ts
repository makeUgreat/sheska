/** 높이를 2px 칸마다 기록한다. */
const COLUMN = 2;
const MAX_HEIGHT = 22;
/** 이웃 칸보다 이만큼 넘게 높으면 옆으로 흘러내린다. */
const MAX_STEP = 0.45;

export interface SnowHeap {
  width: number;
  heights: Float64Array;
}

export function emptyHeap(width: number): SnowHeap {
  return { width, heights: new Float64Array(Math.ceil(width / COLUMN) + 1) };
}

/** 자리마다 한도가 달라 다 쌓여도 평평한 띠가 되지 않는다. 창 모서리로 갈수록 얕아진다. */
export function heightLimit(x: number, width: number): number {
  const wave = 0.45 * Math.sin(x / 29 + 0.7) + 0.35 * Math.sin(x / 73 + 2.1) + 0.2 * Math.sin(x / 151);
  const drift = 0.25 + 0.75 * (0.5 + 0.5 * wave);
  const edge = Math.min(x, width - x);
  return MAX_HEIGHT * drift * Math.min(1, 0.25 + edge / 36);
}

/** `spread`는 눈이 퍼지는 반경(칸 수)이다. */
export function addSnow(heap: SnowHeap, x: number, amount: number, spread: number) {
  const { heights, width } = heap;
  const center = x / COLUMN;
  for (let i = Math.max(0, Math.floor(center - spread * 2)); i <= Math.min(heights.length - 1, Math.ceil(center + spread * 2)); i++) {
    const distance = (i - center) / spread;
    heights[i] += amount * Math.exp(-distance * distance);
  }

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < heights.length; i++) {
      const step = heights[i] - heights[i - 1];
      if (Math.abs(step) > MAX_STEP) {
        const moved = ((Math.abs(step) - MAX_STEP) / 2) * Math.sign(step);
        heights[i] -= moved;
        heights[i - 1] += moved;
      }
    }
  }

  for (let i = 0; i < heights.length; i++) heights[i] = Math.min(heights[i], heightLimit(i * COLUMN, width));
}

/**
 * 윗선은 칸 높이를 이어 부드러운 곡선으로 그린다.
 * 아랫선은 `base`(창 윗변) 아래로 3px쯤 내려와 창 앞면을 덮고, 많이 쌓인 곳일수록 조금 더 처진다.
 */
export function heapPath({ heights, width }: SnowHeap, base: number): string {
  const points = Array.from(heights, (height, i) => [Math.min(i * COLUMN, width), base - Math.max(0.8, height)] as const);
  let d = `M0 ${base + 1} L${points[0][0]} ${points[0][1].toFixed(2)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nextX, nextY] = points[i + 1];
    d += ` Q${x} ${y.toFixed(2)} ${((x + nextX) / 2).toFixed(1)} ${((y + nextY) / 2).toFixed(2)}`;
  }
  d += ` L${width} ${points[points.length - 1][1].toFixed(2)} L${width} ${base + 1}`;
  for (let x = width; x >= 0; x -= 6) {
    const height = heights[Math.min(heights.length - 1, Math.round(x / COLUMN))];
    d += ` L${x} ${(base + 3 + height * 0.15 + Math.sin(x / 11) * 0.5).toFixed(2)}`;
  }

  return `${d} Z`;
}
