import { type PostRepository } from '@contexts/posts/domain';
import {
  type PostQuery,
  type PostQueryResult,
} from '@contexts/posts/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { GetPostUseCase } from '../get-post.use-case';
import { buildPost } from '../../../../../../test/support/domains/fixtures/post.fixture';

type PostRepositoryMock = {
  get: MockedFunction<PostRepository['get']>;
  find: MockedFunction<PostRepository['find']>;
  save: MockedFunction<PostRepository['save']>;
};

type PostQueryMock = {
  get: MockedFunction<PostQuery['get']>;
  find: MockedFunction<PostQuery['find']>;
  paginate: MockedFunction<PostQuery['paginate']>;
  search: MockedFunction<PostQuery['search']>;
};

function buildPostQueryResult(
  overrides: Partial<PostQueryResult> = {},
): PostQueryResult {
  return {
    postId: overrides.postId ?? 'post-1',
    sourceId: overrides.sourceId ?? 'source-1',
    title: overrides.title ?? '테스트 포스트',
    viewCount: overrides.viewCount ?? 1,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    sourceContent: overrides.sourceContent ?? '테스트 source content',
  };
}

describe('GetPostUseCase', () => {
  it('post를 id로 조회하고 viewCount를 증가시켜 저장한 후 sourceContent와 함께 반환한다', async () => {
    const post = buildPost({ sourceId: 'source-1', title: '테스트 포스트' });
    const queryResult = buildPostQueryResult({
      postId: post.id,
      sourceId: 'source-1',
      title: '테스트 포스트',
      viewCount: 1,
      sourceContent: '본문 내용',
    });
    const posts = createPostRepositoryMock();
    const postQuery = createPostQueryMock();
    posts.get.mockResolvedValue(post);
    postQuery.get.mockResolvedValue(queryResult);
    const useCase = new GetPostUseCase(posts, postQuery);

    const result = await useCase.execute({ postId: post.id });

    expect(result).toMatchObject({
      postId: post.id,
      sourceId: 'source-1',
      title: '테스트 포스트',
      viewCount: 1,
      sourceContent: '본문 내용',
    });
    expect(posts.get).toHaveBeenCalledWith({ id: post.id });
    expect(posts.save).toHaveBeenCalledOnce();
    expect(postQuery.get).toHaveBeenCalledWith({ id: post.id });
  });

  it('repository get exception을 전파한다', async () => {
    const getFailure = new Error('Post Repository operation failed');
    const posts = createPostRepositoryMock();
    const postQuery = createPostQueryMock();
    posts.get.mockRejectedValue(getFailure);
    const useCase = new GetPostUseCase(posts, postQuery);

    await expect(useCase.execute({ postId: 'post-1' })).rejects.toBe(
      getFailure,
    );
    expect(posts.save).not.toHaveBeenCalled();
  });

  it('repository save exception을 전파한다', async () => {
    const saveFailure = new Error('Post Repository operation failed');
    const post = buildPost();
    const posts = createPostRepositoryMock();
    const postQuery = createPostQueryMock();
    posts.get.mockResolvedValue(post);
    posts.save.mockRejectedValue(saveFailure);
    const useCase = new GetPostUseCase(posts, postQuery);

    await expect(useCase.execute({ postId: post.id })).rejects.toBe(
      saveFailure,
    );
  });

  it('postQuery.get exception을 전파한다', async () => {
    const queryFailure = new Error('Post Query operation failed');
    const post = buildPost();
    const posts = createPostRepositoryMock();
    const postQuery = createPostQueryMock();
    posts.get.mockResolvedValue(post);
    postQuery.get.mockRejectedValue(queryFailure);
    const useCase = new GetPostUseCase(posts, postQuery);

    await expect(useCase.execute({ postId: post.id })).rejects.toBe(
      queryFailure,
    );
  });
});

function createPostRepositoryMock(): PostRepositoryMock {
  return {
    get: vi.fn<PostRepository['get']>().mockResolvedValue(buildPost()),
    find: vi.fn<PostRepository['find']>().mockResolvedValue(null),
    save: vi
      .fn<PostRepository['save']>()
      .mockImplementation((post) => Promise.resolve(post)),
  };
}

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
  };
}
