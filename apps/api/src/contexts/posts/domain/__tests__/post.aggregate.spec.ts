import { Post } from '@contexts/posts/domain';
import { describe, expect, it } from 'vitest';

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('Post', () => {
  it('sourceId로 post를 생성하고 viewCount는 0으로 시작한다', () => {
    const post = Post.create({ sourceId: 'source-1' });

    expect(post.id).toMatch(UUID_V7_PATTERN);
    expect(post.getProps().sourceId).toBe('source-1');
    expect(post.getProps().viewCount.unpack()).toBe(0);
  });

  it('저장된 id와 viewCount를 그대로 복원한다', () => {
    const post = Post.restore({
      id: 'post-1',
      sourceId: 'source-1',
      viewCount: 42,
    });

    expect(post.id).toBe('post-1');
    expect(post.getProps().viewCount.unpack()).toBe(42);
  });

  it('viewCount를 1 증가시킨다', () => {
    const post = Post.restore({
      id: 'post-1',
      sourceId: 'source-1',
      viewCount: 5,
    });

    post.incrementViewCount();

    expect(post.getProps().viewCount.unpack()).toBe(6);
  });
});
