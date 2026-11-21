import { Post, PostPublishedDomainEvent } from '@contexts/library/domain';
import { describe, expect, it } from 'vitest';

describe('Post', () => {
  // nocap: library-post-2
  it('source와 식별자를 공유하고 viewCount는 0으로 시작한다', () => {
    const post = Post.create({ sourceId: 'source-1' });

    expect(post.id).toBe('source-1');
    expect(post.sourceId).toBe('source-1');
    expect(post.getProps().viewCount.unpack()).toBe(0);
  });

  it('post를 만들면 게시 사건을 기록한다', () => {
    const post = Post.create({ sourceId: 'source-1' });

    expect(post.domainEvents).toHaveLength(1);
    expect(post.domainEvents[0]).toBeInstanceOf(PostPublishedDomainEvent);
    expect(post.domainEvents[0]?.aggregateId).toBe('source-1');
  });

  it('복원한 post는 게시 사건을 기록하지 않는다', () => {
    const post = Post.restore({ id: 'source-1', viewCount: 0 });

    expect(post.domainEvents).toEqual([]);
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
