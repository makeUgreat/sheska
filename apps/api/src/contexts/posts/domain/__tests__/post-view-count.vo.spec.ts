import { PostViewCount } from '@contexts/posts/domain';
import { describe, expect, it } from 'vitest';

describe('PostViewCount', () => {
  describe('of', () => {
    it('음수이면 throw한다', () => {
      expect(() => PostViewCount.of(-1)).toThrow(
        'Post view count must be a non-negative integer',
      );
    });

    it('정수가 아니면 throw한다', () => {
      expect(() => PostViewCount.of(1.5)).toThrow(
        'Post view count must be a non-negative integer',
      );
    });
  });

  describe('increment', () => {
    it('값을 1 증가시킨 새 인스턴스를 반환한다', () => {
      const count = PostViewCount.of(5);

      expect(count.increment().unpack()).toBe(6);
    });
  });
});
