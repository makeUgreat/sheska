import { PostView, PostViewClient } from '@contexts/library/domain';
import { describe, expect, it } from 'vitest';

function buildView(viewedAt: string): PostView {
  return PostView.of({ postId: 'post-1', ip: '203.0.113.1', client: PostViewClient.of('Mozilla/5.0'), viewedAt: new Date(viewedAt) });
}

describe('PostView', () => {
  describe('countsAfter', () => {
    // nocap: library-post-5
    it('같은 방문자의 센 조회가 없으면 센다', () => {
      expect(buildView('2026-11-21T10:00:00.000Z').countsAfter(null)).toBe(true);
    });

    // nocap: library-post-5
    it('마지막으로 센 조회부터 30분이 지나지 않았으면 세지 않는다', () => {
      const previous = buildView('2026-11-21T10:00:00.000Z');

      expect(buildView('2026-11-21T10:29:59.999Z').countsAfter(previous)).toBe(false);
    });

    // nocap: library-post-5
    it('마지막으로 센 조회부터 30분이 지났으면 센다', () => {
      const previous = buildView('2026-11-21T10:00:00.000Z');

      expect(buildView('2026-11-21T10:30:00.000Z').countsAfter(previous)).toBe(true);
    });
  });
});
