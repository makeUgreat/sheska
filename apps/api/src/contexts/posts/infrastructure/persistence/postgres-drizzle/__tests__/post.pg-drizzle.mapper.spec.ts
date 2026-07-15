import { describe, expect, it } from 'vitest';
import { buildPost } from '../../../../../../../test/support/domains/fixtures/post.fixture';
import { buildPostRow } from '../../../../../../../test/adapters/postgres/posts/fixtures/post-row.fixture';
import { PostPgDrizzleMapper } from '../post.pg-drizzle.mapper';

describe('PostPgDrizzleMapper', () => {
  it('valid post row를 Post aggregate로 복원한다', () => {
    const row = buildPostRow({ title: '복원 테스트', viewCount: 5 });

    const post = PostPgDrizzleMapper.toDomain(row);

    expect(post.id).toBe('post-1');
    expect(post.getProps().sourceId).toBe('source-1');
    expect(post.getProps().title.unpack()).toBe('복원 테스트');
    expect(post.getProps().viewCount.unpack()).toBe(5);
  });

  it('Post aggregate를 post insert row로 변환한다', () => {
    const post = buildPost({ sourceId: 'source-1', title: '변환 테스트' });

    const row = PostPgDrizzleMapper.toInsert(post);

    expect(row).toEqual({
      id: post.id,
      sourceId: 'source-1',
      title: '변환 테스트',
      viewCount: 0,
    });
  });
});
