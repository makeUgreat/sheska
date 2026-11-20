import { describe, expect, it } from 'vitest';
import { addSnow, emptyHeap, heightLimit } from './snow-heap-shape';

describe('addSnow', () => {
  it('한 곳에 떨어진 눈은 떨어진 자리가 가장 높고 양옆으로 낮아진다', () => {
    const heap = emptyHeap(400);

    addSnow(heap, 200, 1, 2);

    const [left, center, right] = [heap.heights[96], heap.heights[100], heap.heights[104]];
    expect(center).toBeGreaterThan(left);
    expect(center).toBeGreaterThan(right);
    expect(left).toBeGreaterThan(0);
  });

  it('같은 자리에 계속 내려도 자리마다의 한도를 넘지 않는다', () => {
    const heap = emptyHeap(400);

    for (let i = 0; i < 2000; i++) addSnow(heap, 200, 1, 2);

    heap.heights.forEach((height, i) => {
      expect(height).toBeLessThanOrEqual(heightLimit(i * 2, 400));
    });
  });

  it('창 끝에는 가운데보다 적게 쌓인다', () => {
    const heap = emptyHeap(400);

    for (let x = 0; x <= 400; x += 2) {
      for (let i = 0; i < 50; i++) addSnow(heap, x, 1, 2);
    }

    expect(heap.heights[0]).toBeLessThan(Math.max(...heap.heights));
  });
});
