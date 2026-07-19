import { type PostRepository } from '@contexts/posts/domain';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { ListPostsUseCase } from '../list-posts.use-case';
import { buildPost } from '../../../../../../test/support/domains/fixtures/post.fixture';

type PostRepositoryMock = {
  get: MockedFunction<PostRepository['get']>;
  find: MockedFunction<PostRepository['find']>;
  list: MockedFunction<PostRepository['list']>;
  save: MockedFunction<PostRepository['save']>;
};

describe('ListPostsUseCase', () => {
  it('전체 post 목록을 반환한다', async () => {
    const post1 = buildPost({ sourceId: 'source-1', title: '첫 번째 포스트' });
    const post2 = buildPost({ sourceId: 'source-2', title: '두 번째 포스트' });
    const posts = createPostRepositoryMock();
    posts.list.mockResolvedValue({ posts: [post1, post2], nextCursor: null });
    const useCase = new ListPostsUseCase(posts);

    const result = await useCase.execute();

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0]).toMatchObject({
      postId: post1.id,
      sourceId: 'source-1',
      title: '첫 번째 포스트',
      viewCount: 0,
    });
    expect(result.posts[1]).toMatchObject({
      postId: post2.id,
      sourceId: 'source-2',
      title: '두 번째 포스트',
      viewCount: 0,
    });
    expect(posts.list).toHaveBeenCalledOnce();
  });

  it('post가 없으면 빈 배열을 반환한다', async () => {
    const posts = createPostRepositoryMock();
    posts.list.mockResolvedValue({ posts: [], nextCursor: null });
    const useCase = new ListPostsUseCase(posts);

    const result = await useCase.execute();

    expect(result.posts).toHaveLength(0);
  });

  it('nextCursor가 있으면 그대로 반환한다', async () => {
    const post = buildPost({ sourceId: 'source-1', title: '포스트' });
    const now = new Date('2026-01-01T00:00:00.000Z');
    const cursor = { createdAt: now, id: 'post-cursor-id' };
    const posts = createPostRepositoryMock();
    posts.list.mockResolvedValue({ posts: [post], nextCursor: cursor });
    const useCase = new ListPostsUseCase(posts);

    const result = await useCase.execute();

    expect(result.nextCursor).toEqual(cursor);
  });

  it('nextCursor가 없으면 null을 반환한다', async () => {
    const post = buildPost({ sourceId: 'source-1', title: '포스트' });
    const posts = createPostRepositoryMock();
    posts.list.mockResolvedValue({ posts: [post], nextCursor: null });
    const useCase = new ListPostsUseCase(posts);

    const result = await useCase.execute();

    expect(result.nextCursor).toBeNull();
  });

  it('repository list exception을 전파한다', async () => {
    const listFailure = new Error('Post Repository operation failed');
    const posts = createPostRepositoryMock();
    posts.list.mockRejectedValue(listFailure);
    const useCase = new ListPostsUseCase(posts);

    await expect(useCase.execute()).rejects.toBe(listFailure);
  });
});

function createPostRepositoryMock(): PostRepositoryMock {
  return {
    get: vi.fn<PostRepository['get']>().mockResolvedValue(buildPost()),
    find: vi.fn<PostRepository['find']>().mockResolvedValue(null),
    list: vi
      .fn<PostRepository['list']>()
      .mockResolvedValue({ posts: [], nextCursor: null }),
    save: vi
      .fn<PostRepository['save']>()
      .mockImplementation((post) => Promise.resolve(post)),
  };
}
