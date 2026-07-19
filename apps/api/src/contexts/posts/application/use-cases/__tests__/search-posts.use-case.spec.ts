import { type PostRepository } from '@contexts/posts/domain';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { SearchPostsUseCase } from '../search-posts.use-case';
import { buildPost } from '../../../../../../test/support/domains/fixtures/post.fixture';

type PostRepositoryMock = {
  get: MockedFunction<PostRepository['get']>;
  find: MockedFunction<PostRepository['find']>;
  list: MockedFunction<PostRepository['list']>;
  save: MockedFunction<PostRepository['save']>;
};

describe('SearchPostsUseCase', () => {
  it('query와 유사한 title을 가진 post 목록을 반환한다', async () => {
    const post1 = buildPost({ sourceId: 'source-1', title: 'TypeScript 입문' });
    const post2 = buildPost({ sourceId: 'source-2', title: 'TypeScript 심화' });
    const posts = createPostRepositoryMock();
    posts.list.mockResolvedValue({ posts: [post1, post2], nextCursor: null });
    const useCase = new SearchPostsUseCase(posts);

    const result = await useCase.execute({ query: 'TypeScript' });

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0]).toMatchObject({
      postId: post1.id,
      sourceId: 'source-1',
      title: 'TypeScript 입문',
      viewCount: 0,
    });
    expect(posts.list).toHaveBeenCalledWith({
      query: 'TypeScript',
      cursor: undefined,
      limit: 20,
    });
  });

  it('일치하는 post가 없으면 빈 배열을 반환한다', async () => {
    const posts = createPostRepositoryMock();
    posts.list.mockResolvedValue({ posts: [], nextCursor: null });
    const useCase = new SearchPostsUseCase(posts);

    const result = await useCase.execute({ query: 'nothing' });

    expect(result.posts).toHaveLength(0);
  });

  it('repository list exception을 전파한다', async () => {
    const listFailure = new Error('Post Repository operation failed');
    const posts = createPostRepositoryMock();
    posts.list.mockRejectedValue(listFailure);
    const useCase = new SearchPostsUseCase(posts);

    await expect(useCase.execute({ query: 'TypeScript' })).rejects.toBe(
      listFailure,
    );
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
