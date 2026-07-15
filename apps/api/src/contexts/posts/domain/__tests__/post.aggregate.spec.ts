import { Post } from '@contexts/posts/domain';
import { describe, expect, it } from 'vitest';

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('Post', () => {
  describe('create', () => {
    it('sourceId와 title로 post를 생성하고 viewCount는 0으로 시작한다', () => {
      const post = Post.create({ sourceId: 'source-1', title: '제목' });
      const props = post.getProps();

      expect(props.id).toMatch(UUID_V7_PATTERN);
      expect(props.sourceId).toBe('source-1');
      expect(props.title.unpack()).toBe('제목');
      expect(props.viewCount.unpack()).toBe(0);
    });

    it('title의 앞뒤 공백을 제거한다', () => {
      const post = Post.create({ sourceId: 'source-1', title: '  제목  ' });

      expect(post.getProps().title.unpack()).toBe('제목');
    });

    it('title이 빈 문자열이면 throw한다', () => {
      expect(() => Post.create({ sourceId: 'source-1', title: '   ' })).toThrow(
        'Post title must be between 1 and 200 characters',
      );
    });

    it('title이 200자를 초과하면 throw한다', () => {
      expect(() =>
        Post.create({ sourceId: 'source-1', title: 'a'.repeat(201) }),
      ).toThrow('Post title must be between 1 and 200 characters');
    });
  });

  describe('restore', () => {
    it('저장된 id와 viewCount를 그대로 복원한다', () => {
      const post = Post.restore({
        id: 'post-1',
        sourceId: 'source-1',
        title: '제목',
        viewCount: 42,
      });
      const props = post.getProps();

      expect(post.id).toBe('post-1');
      expect(props.viewCount.unpack()).toBe(42);
    });
  });

  describe('incrementViewCount', () => {
    it('viewCount를 1 증가시킨다', () => {
      const post = Post.restore({
        id: 'post-1',
        sourceId: 'source-1',
        title: '제목',
        viewCount: 5,
      });

      post.incrementViewCount();

      expect(post.getProps().viewCount.unpack()).toBe(6);
    });
  });

  describe('updateTitle', () => {
    it('title을 새 값으로 변경한다', () => {
      const post = Post.restore({
        id: 'post-1',
        sourceId: 'source-1',
        title: '기존 제목',
        viewCount: 0,
      });

      post.updateTitle('새 제목');

      expect(post.getProps().title.unpack()).toBe('새 제목');
    });

    it('앞뒤 공백을 제거한 값으로 변경한다', () => {
      const post = Post.restore({
        id: 'post-1',
        sourceId: 'source-1',
        title: '기존 제목',
        viewCount: 0,
      });

      post.updateTitle('  새 제목  ');

      expect(post.getProps().title.unpack()).toBe('새 제목');
    });

    it('빈 문자열이면 throw한다', () => {
      const post = Post.restore({
        id: 'post-1',
        sourceId: 'source-1',
        title: '기존 제목',
        viewCount: 0,
      });

      expect(() => post.updateTitle('   ')).toThrow(
        'Post title must be between 1 and 200 characters',
      );
    });

    it('200자를 초과하면 throw한다', () => {
      const post = Post.restore({
        id: 'post-1',
        sourceId: 'source-1',
        title: '기존 제목',
        viewCount: 0,
      });

      expect(() => post.updateTitle('a'.repeat(201))).toThrow(
        'Post title must be between 1 and 200 characters',
      );
    });
  });
});
