import {
  type PostQuery,
  type PostQueryPaginateResult,
} from '@contexts/posts/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { SearchPostsUseCase } from '../search-posts.use-case';

type PostQueryMock = {
  get: MockedFunction<PostQuery['get']>;
  find: MockedFunction<PostQuery['find']>;
  paginate: MockedFunction<PostQuery['paginate']>;
  search: MockedFunction<PostQuery['search']>;
};

function buildPaginateResult(
  overrides: Partial<PostQueryPaginateResult> = {},
): PostQueryPaginateResult {
  return {
    posts: [],
    nextCursor: null,
    ...overrides,
  };
}

describe('SearchPostsUseCase', () => {
  it('query와 유사한 title을 가진 post 목록을 반환한다', async () => {
    const postQuery = createPostQueryMock();
    postQuery.search.mockResolvedValue(
      buildPaginateResult({
        posts: [
          {
            postId: 'post-1',
            sourceId: 'source-1',
            title: 'TypeScript 입문',
            viewCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            postId: 'post-2',
            sourceId: 'source-2',
            title: 'TypeScript 심화',
            viewCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }),
    );
    const useCase = new SearchPostsUseCase(postQuery);

    const result = await useCase.execute({ query: 'TypeScript' });

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0]).toMatchObject({
      postId: 'post-1',
      sourceId: 'source-1',
      title: 'TypeScript 입문',
      viewCount: 0,
    });
    expect(postQuery.search).toHaveBeenCalledWith({
      query: 'TypeScript',
      cursor: undefined,
      limit: 20,
    });
  });

  it('일치하는 post가 없으면 빈 배열을 반환한다', async () => {
    const postQuery = createPostQueryMock();
    postQuery.search.mockResolvedValue(buildPaginateResult());
    const useCase = new SearchPostsUseCase(postQuery);

    const result = await useCase.execute({ query: 'nothing' });

    expect(result.posts).toHaveLength(0);
  });

  it('postQuery search exception을 전파한다', async () => {
    const searchFailure = new Error('Post Query operation failed');
    const postQuery = createPostQueryMock();
    postQuery.search.mockRejectedValue(searchFailure);
    const useCase = new SearchPostsUseCase(postQuery);

    await expect(useCase.execute({ query: 'TypeScript' })).rejects.toBe(
      searchFailure,
    );
  });
});

function createPostQueryMock(): PostQueryMock {
  return {
    get: vi.fn<PostQuery['get']>().mockResolvedValue(null as never),
    find: vi.fn<PostQuery['find']>().mockResolvedValue(null),
    paginate: vi
      .fn<PostQuery['paginate']>()
      .mockResolvedValue(buildPaginateResult()),
    search: vi
      .fn<PostQuery['search']>()
      .mockResolvedValue(buildPaginateResult()),
  };
}
