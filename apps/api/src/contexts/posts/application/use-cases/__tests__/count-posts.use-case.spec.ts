import { type PostQuery } from '@contexts/posts/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { CountPostsUseCase } from '../count-posts.use-case';

type PostQueryMock = {
  get: MockedFunction<PostQuery['get']>;
  find: MockedFunction<PostQuery['find']>;
  paginate: MockedFunction<PostQuery['paginate']>;
  search: MockedFunction<PostQuery['search']>;
  count: MockedFunction<PostQuery['count']>;
};

describe('CountPostsUseCase', () => {
  it('post의 전체 갯수를 반환한다', async () => {
    const postQuery = createPostQueryMock();
    postQuery.count.mockResolvedValue(42);
    const useCase = new CountPostsUseCase(postQuery);

    const result = await useCase.execute();

    expect(result).toBe(42);
    expect(postQuery.count).toHaveBeenCalledOnce();
  });

  it('post가 없으면 0을 반환한다', async () => {
    const postQuery = createPostQueryMock();
    postQuery.count.mockResolvedValue(0);
    const useCase = new CountPostsUseCase(postQuery);

    const result = await useCase.execute();

    expect(result).toBe(0);
  });

  it('postQuery count exception을 전파한다', async () => {
    const countFailure = new Error('Post Query operation failed');
    const postQuery = createPostQueryMock();
    postQuery.count.mockRejectedValue(countFailure);
    const useCase = new CountPostsUseCase(postQuery);

    await expect(useCase.execute()).rejects.toBe(countFailure);
  });
});

function createPostQueryMock(): PostQueryMock {
  return {
    get: vi.fn<PostQuery['get']>().mockResolvedValue(null as never),
    find: vi.fn<PostQuery['find']>().mockResolvedValue(null),
    paginate: vi
      .fn<PostQuery['paginate']>()
      .mockResolvedValue({ posts: [], nextCursor: null }),
    search: vi
      .fn<PostQuery['search']>()
      .mockResolvedValue({ posts: [], nextCursor: null }),
    count: vi.fn<PostQuery['count']>().mockResolvedValue(0),
  };
}
