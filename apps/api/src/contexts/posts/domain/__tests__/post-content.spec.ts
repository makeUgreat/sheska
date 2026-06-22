import { PostContent } from '@contexts/posts/domain';
import { describe, expect, it } from 'vitest';

describe('PostContent', () => {
  describe('of', () => {
    it('앞뒤 공백을 제거한 content value object를 반환한다', () => {
      const result = PostContent.of('  본문입니다.  ');

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.value).toBe('본문입니다.');
      }
    });

    it('content가 공백뿐이면 실패 Result를 반환한다', () => {
      const result = PostContent.of('  ');

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toMatchObject({
          code: 'post.content_empty',
          details: { fields: ['content'] },
        });
      }
    });
  });
});
