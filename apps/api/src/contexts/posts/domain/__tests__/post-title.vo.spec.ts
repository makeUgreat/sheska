import { PostTitle } from '@contexts/posts/domain';
import { describe, expect, it } from 'vitest';

describe('PostTitle', () => {
  describe('of', () => {
    it('앞뒤 공백을 제거한다', () => {
      expect(PostTitle.of('  제목  ').unpack()).toBe('제목');
    });

    it('빈 문자열이면 throw한다', () => {
      expect(() => PostTitle.of('   ')).toThrow(
        'Post title must be between 1 and 200 characters',
      );
    });

    it('200자를 초과하면 throw한다', () => {
      expect(() => PostTitle.of('a'.repeat(201))).toThrow(
        'Post title must be between 1 and 200 characters',
      );
    });
  });
});
