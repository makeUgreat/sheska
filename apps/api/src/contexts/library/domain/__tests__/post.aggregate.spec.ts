import { Post } from '@contexts/library/domain';
import { describe, expect, it } from 'vitest';

describe('Post', () => {
  it('source와 식별자를 공유하고 viewCount는 0으로 시작한다', () => {
    const post = Post.create({ sourceId: 'source-1' });

    expect(post.id).toBe('source-1');
    expect(post.sourceId).toBe('source-1');
    expect(post.getProps().viewCount.unpack()).toBe(0);
  });

  it('저장된 id와 viewCount를 그대로 복원한다', () => {
    const post = Post.restore({
      id: 'source-1',
      viewCount: 42,
    });

    expect(post.id).toBe('source-1');
    expect(post.sourceId).toBe('source-1');
    expect(post.getProps().viewCount.unpack()).toBe(42);
  });

  it('viewCount를 1 증가시킨다', () => {
    const post = Post.restore({
      id: 'source-1',
      viewCount: 5,
    });

    post.incrementViewCount();

    expect(post.getProps().viewCount.unpack()).toBe(6);
  });
});
