import { type PostQuery, type PostQueryResult } from '@contexts/library/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { GetPostUseCase } from '../get-post.use-case';

type PostQueryMock = {
  get: MockedFunction<PostQuery['get']>;
  find: MockedFunction<PostQuery['find']>;
  paginate: MockedFunction<PostQuery['paginate']>;
  search: MockedFunction<PostQuery['search']>;
  count: MockedFunction<PostQuery['count']>;
};

function buildPostQueryResult(overrides: Partial<PostQueryResult> = {}): PostQueryResult {
  return {
    postId: overrides.postId ?? 'post-1',
    sourceId: overrides.sourceId ?? 'source-1',
    title: overrides.title ?? '테스트 포스트',
    body: overrides.body ?? '테스트 source content',
    viewCount: overrides.viewCount ?? 1,
    summary: { kind: 'pending' },
    series: null,
    project: null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

describe('GetPostUseCase', () => {
  it('post를 id로 조회해 반환한다', async () => {
    const queryResult = buildPostQueryResult({ postId: 'post-1', body: '본문 내용' });
    const postQuery = createPostQueryMock();
    postQuery.get.mockResolvedValue(queryResult);
    const useCase = new GetPostUseCase(postQuery);

    const result = await useCase.execute({ postId: 'post-1' });

    expect(result).toBe(queryResult);
    expect(postQuery.get).toHaveBeenCalledWith({ id: 'post-1' });
  });

  it('postQuery.get exception을 전파한다', async () => {
    const queryFailure = new Error('Post Query operation failed');
    const postQuery = createPostQueryMock();
    postQuery.get.mockRejectedValue(queryFailure);
    const useCase = new GetPostUseCase(postQuery);

    await expect(useCase.execute({ postId: 'post-1' })).rejects.toBe(queryFailure);
  });
});

function createPostQueryMock(): PostQueryMock {
  return {
    get: vi.fn<PostQuery['get']>().mockResolvedValue(null as never),
    find: vi.fn<PostQuery['find']>().mockResolvedValue(null),
    paginate: vi.fn<PostQuery['paginate']>().mockResolvedValue({ posts: [], nextCursor: null }),
    search: vi.fn<PostQuery['search']>().mockResolvedValue({ posts: [], nextCursor: null }),
    count: vi.fn<PostQuery['count']>().mockResolvedValue(0),
  };
}
