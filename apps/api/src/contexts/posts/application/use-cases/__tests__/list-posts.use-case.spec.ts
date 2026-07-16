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
    posts.list.mockResolvedValue([post1, post2]);
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
    posts.list.mockResolvedValue([]);
    const useCase = new ListPostsUseCase(posts);

    const result = await useCase.execute();

    expect(result.posts).toHaveLength(0);
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
    list: vi.fn<PostRepository['list']>().mockResolvedValue([]),
    save: vi
      .fn<PostRepository['save']>()
      .mockImplementation((post) => Promise.resolve(post)),
  };
}
