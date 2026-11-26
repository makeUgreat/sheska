import { NotFoundError } from '@core/errors';
import { type PostViewQuery, type PostViewQueryPaginateResult } from '@contexts/library/application/ports';
import { Post, type PostRepository } from '@contexts/library/domain';
import { describe, expect, it, vi } from 'vitest';
import { ListPostViewsUseCase } from '../list-post-views.use-case';

const PAGE: PostViewQueryPaginateResult = {
  views: [{ viewedAt: new Date('2026-11-21T10:00:00.000Z'), ip: '203.0.113.1', client: 'Mozilla/5.0' }],
  nextCursor: { id: '7' },
};

function setup() {
  const posts = {
    get: vi.fn<PostRepository['get']>().mockResolvedValue(Post.restore({ id: 'post-1', viewCount: 1 })),
    insert: vi.fn<PostRepository['insert']>(),
    update: vi.fn<PostRepository['update']>(),
    delete: vi.fn<PostRepository['delete']>(),
  };
  const postViewQuery = { paginate: vi.fn<PostViewQuery['paginate']>().mockResolvedValue(PAGE) };

  return { posts, postViewQuery, useCase: new ListPostViewsUseCase(posts, postViewQuery) };
}

describe('ListPostViewsUseCase', () => {
  it('post의 조회내역 한 페이지를 돌려준다', async () => {
    const { postViewQuery, useCase } = setup();

    const result = await useCase.execute({ postId: 'post-1', cursor: { id: '9' }, limit: 20 });

    expect(result).toBe(PAGE);
    expect(postViewQuery.paginate).toHaveBeenCalledWith({ postId: 'post-1', cursor: { id: '9' }, limit: 20 });
  });

  it('post가 없으면 NotFoundError를 전파한다', async () => {
    const notFound = new NotFoundError({ code: 'post.not_found', message: 'Post not found', details: {} });
    const { posts, useCase } = setup();
    posts.get.mockRejectedValue(notFound);

    await expect(useCase.execute({ postId: 'missing', cursor: null, limit: 20 })).rejects.toBe(notFound);
  });
});
