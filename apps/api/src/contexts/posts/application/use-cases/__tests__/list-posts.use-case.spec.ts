import {
  type PostQuery,
  type PostQueryPaginateResult,
} from '@contexts/posts/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { ListPostsUseCase } from '../list-posts.use-case';

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

describe('ListPostsUseCase', () => {
  it('전체 post 목록을 반환한다', async () => {
    const postQuery = createPostQueryMock();
    postQuery.paginate.mockResolvedValue(
      buildPaginateResult({
        posts: [
          {
            postId: 'post-1',
            sourceId: 'source-1',
            title: '첫 번째 포스트',
            viewCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            postId: 'post-2',
            sourceId: 'source-2',
            title: '두 번째 포스트',
            viewCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }),
    );
    const useCase = new ListPostsUseCase(postQuery);

    const result = await useCase.execute();

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0]).toMatchObject({
      postId: 'post-1',
      sourceId: 'source-1',
      title: '첫 번째 포스트',
      viewCount: 0,
    });
    expect(result.posts[1]).toMatchObject({
      postId: 'post-2',
      sourceId: 'source-2',
      title: '두 번째 포스트',
      viewCount: 0,
    });
    expect(postQuery.paginate).toHaveBeenCalledOnce();
  });

  it('post가 없으면 빈 배열을 반환한다', async () => {
    const postQuery = createPostQueryMock();
    postQuery.paginate.mockResolvedValue(buildPaginateResult());
    const useCase = new ListPostsUseCase(postQuery);

    const result = await useCase.execute();

    expect(result.posts).toHaveLength(0);
  });

  it('nextCursor가 있으면 그대로 반환한다', async () => {
    const cursor = {
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      id: 'post-cursor-id',
    };
    const postQuery = createPostQueryMock();
    postQuery.paginate.mockResolvedValue(
      buildPaginateResult({
        posts: [
          {
            postId: 'post-1',
            sourceId: 'source-1',
            title: '포스트',
            viewCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        nextCursor: cursor,
      }),
    );
    const useCase = new ListPostsUseCase(postQuery);

    const result = await useCase.execute();

    expect(result.nextCursor).toEqual(cursor);
  });

  it('nextCursor가 없으면 null을 반환한다', async () => {
    const postQuery = createPostQueryMock();
    postQuery.paginate.mockResolvedValue(
      buildPaginateResult({ nextCursor: null }),
    );
    const useCase = new ListPostsUseCase(postQuery);

    const result = await useCase.execute();

    expect(result.nextCursor).toBeNull();
  });

  it('기본 limit 20으로 paginate를 호출한다', async () => {
    const postQuery = createPostQueryMock();
    postQuery.paginate.mockResolvedValue(buildPaginateResult());
    const useCase = new ListPostsUseCase(postQuery);

    await useCase.execute();

    expect(postQuery.paginate).toHaveBeenCalledWith({
      limit: 20,
      cursor: undefined,
    });
  });

  it('postQuery paginate exception을 전파한다', async () => {
    const paginateFailure = new Error('Post Query operation failed');
    const postQuery = createPostQueryMock();
    postQuery.paginate.mockRejectedValue(paginateFailure);
    const useCase = new ListPostsUseCase(postQuery);

    await expect(useCase.execute()).rejects.toBe(paginateFailure);
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
