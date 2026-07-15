import { type PostRepository } from '@contexts/posts/domain';
import { APPLICATION_ERROR_KIND } from '@kernels/application';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { GetPostUseCase } from '../get-post.use-case';
import { buildPost } from '../../../../../../test/support/domains/fixtures/post.fixture';

type PostRepositoryMock = {
  get: MockedFunction<PostRepository['get']>;
  findBySourceId: MockedFunction<PostRepository['findBySourceId']>;
  list: MockedFunction<PostRepository['list']>;
  save: MockedFunction<PostRepository['save']>;
};

describe('GetPostUseCase', () => {
  it('post를 id로 조회하고 viewCount를 증가시켜 저장한 후 반환한다', async () => {
    const post = buildPost({ sourceId: 'source-1', title: '테스트 포스트' });
    const posts = createPostRepositoryMock();
    posts.get.mockResolvedValue(post);
    const useCase = new GetPostUseCase(posts);

    const result = await useCase.execute({ postId: post.id });

    expect(result).toMatchObject({
      postId: post.id,
      sourceId: 'source-1',
      title: '테스트 포스트',
      viewCount: 1,
    });
    expect(posts.get).toHaveBeenCalledWith({ id: post.id });
    expect(posts.save).toHaveBeenCalledOnce();
  });

  it('post가 없으면 NOT_FOUND exception을 throw한다', async () => {
    const posts = createPostRepositoryMock();
    posts.get.mockResolvedValue(null);
    const useCase = new GetPostUseCase(posts);

    await expect(
      useCase.execute({ postId: 'non-existent' }),
    ).rejects.toMatchObject({
      kind: APPLICATION_ERROR_KIND.NOT_FOUND,
      code: 'posts.post_not_found',
    });
    expect(posts.save).not.toHaveBeenCalled();
  });

  it('repository get exception을 전파한다', async () => {
    const getFailure = new Error('Post Repository operation failed');
    const posts = createPostRepositoryMock();
    posts.get.mockRejectedValue(getFailure);
    const useCase = new GetPostUseCase(posts);

    await expect(useCase.execute({ postId: 'post-1' })).rejects.toBe(
      getFailure,
    );
    expect(posts.save).not.toHaveBeenCalled();
  });

  it('repository save exception을 전파한다', async () => {
    const saveFailure = new Error('Post Repository operation failed');
    const post = buildPost();
    const posts = createPostRepositoryMock();
    posts.get.mockResolvedValue(post);
    posts.save.mockRejectedValue(saveFailure);
    const useCase = new GetPostUseCase(posts);

    await expect(useCase.execute({ postId: post.id })).rejects.toBe(
      saveFailure,
    );
  });
});

function createPostRepositoryMock(): PostRepositoryMock {
  return {
    get: vi.fn<PostRepository['get']>().mockResolvedValue(null),
    findBySourceId: vi
      .fn<PostRepository['findBySourceId']>()
      .mockResolvedValue(null),
    list: vi.fn<PostRepository['list']>().mockResolvedValue([]),
    save: vi
      .fn<PostRepository['save']>()
      .mockImplementation((post) => Promise.resolve(post)),
  };
}
