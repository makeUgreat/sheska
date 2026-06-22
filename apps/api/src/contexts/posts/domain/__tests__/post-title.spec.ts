import { PostTitle } from '@contexts/posts/domain';
import { describe, expect, it } from 'vitest';

describe('PostTitle', () => {
  describe('of', () => {
    it('앞뒤 공백을 제거한 title value object를 반환한다', () => {
      const result = PostTitle.of('  첫 글  ');

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.value).toBe('첫 글');
      }
    });

    it('title이 공백뿐이면 실패 Result를 반환한다', () => {
      const result = PostTitle.of('  ');

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toMatchObject({
          code: 'post.title_empty',
          details: { fields: ['title'] },
        });
      }
    });
  });
});
