import { Post } from '@contexts/posts/domain';
import { describe, expect, it } from 'vitest';

describe('Post', () => {
  describe('restore', () => {
    it('유효한 값으로 Post를 복원한다', () => {
      const result = Post.restore({
        id: '  post-1  ',
        title: '  첫 글  ',
        content: '  본문입니다.  ',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const props = result.value.getProps();

        expect(props.id).toBe('post-1');
        expect(props.title.value).toBe('첫 글');
        expect(props.content.value).toBe('본문입니다.');
      }
    });

    it('id가 빈 문자열이면 실패 Result를 반환한다', () => {
      const result = Post.restore({
        id: '  ',
        title: '첫 글',
        content: '본문입니다.',
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('entity.id_empty');
      }
    });

    it('title이 공백뿐이면 실패 Result를 반환한다', () => {
      const result = Post.restore({
        id: 'post-1',
        title: '  ',
        content: '본문입니다.',
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('post.title_empty');
      }
    });

    it('content가 공백뿐이면 실패 Result를 반환한다', () => {
      const result = Post.restore({
        id: 'post-1',
        title: '첫 글',
        content: '  ',
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('post.content_empty');
      }
    });
  });
});
