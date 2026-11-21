import { NotFoundError } from '@core/errors';
import { Post, PostView, PostViewClient, type PostRepository, type PostViewRepository } from '@contexts/library/domain';
import { describe, expect, it, vi } from 'vitest';
import { RecordPostViewUseCase } from '../record-post-view.use-case';

const COMMAND = { postId: 'post-1', ip: '203.0.113.1', userAgent: 'Mozilla/5.0' };

describe('RecordPostViewUseCase', () => {
  // nocap: library-post-7
  it('센 조회는 방문 기록으로 남기고 조회수를 1 늘린다', async () => {
    const { posts, postViews, useCase } = setup({ viewCount: 3, latest: null });

    await useCase.execute(COMMAND);

    expect(posts.get).toHaveBeenCalledWith({ id: 'post-1' });
    expect(postViews.findLatest).toHaveBeenCalledWith({ postId: 'post-1', ip: '203.0.113.1' });
    expect(postViews.insert.mock.calls[0]?.[0].unpack()).toMatchObject({
      postId: 'post-1',
      ip: '203.0.113.1',
      client: PostViewClient.of('Mozilla/5.0'),
    });
    expect(posts.update.mock.calls[0]?.[0].getProps().viewCount.unpack()).toBe(4);
  });

  // nocap: library-post-7
  it('세지 않은 조회는 방문 기록으로 남기지 않고 조회수도 늘리지 않는다', async () => {
    const { posts, postViews, useCase } = setup({
      viewCount: 3,
      latest: PostView.of({ postId: 'post-1', ip: '203.0.113.1', client: PostViewClient.of('Mozilla/5.0'), viewedAt: new Date() }),
    });

    await useCase.execute(COMMAND);

    expect(postViews.insert).not.toHaveBeenCalled();
    expect(posts.update).not.toHaveBeenCalled();
  });

  it('post가 없으면 NotFoundError를 전파한다', async () => {
    const notFound = new NotFoundError({ code: 'post.not_found', message: 'Post not found', details: {} });
    const { posts, postViews, useCase } = setup({ viewCount: 0, latest: null });
    posts.get.mockRejectedValue(notFound);

    await expect(useCase.execute(COMMAND)).rejects.toBe(notFound);
    expect(postViews.insert).not.toHaveBeenCalled();
  });

  it('방문 기록 exception을 전파한다', async () => {
    const insertFailure = new Error('Post View Repository operation failed');
    const { postViews, useCase } = setup({ viewCount: 0, latest: null });
    postViews.insert.mockRejectedValue(insertFailure);

    await expect(useCase.execute(COMMAND)).rejects.toBe(insertFailure);
  });
});

function setup({ viewCount, latest }: { viewCount: number; latest: PostView | null }) {
  const posts = {
    get: vi.fn<PostRepository['get']>().mockResolvedValue(Post.restore({ id: 'post-1', viewCount })),
    insert: vi.fn<PostRepository['insert']>(),
    update: vi.fn<PostRepository['update']>().mockImplementation((post) => Promise.resolve(post)),
  };
  const postViews = {
    findLatest: vi.fn<PostViewRepository['findLatest']>().mockResolvedValue(latest),
    insert: vi.fn<PostViewRepository['insert']>().mockResolvedValue(undefined),
  };

  return { posts, postViews, useCase: new RecordPostViewUseCase(posts, postViews) };
}
