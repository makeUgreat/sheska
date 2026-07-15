import { type PostRepository } from '@contexts/posts/domain';
import { APPLICATION_ERROR_KIND } from '@kernels/application';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { UpdatePostTitleUseCase } from '../update-post-title.use-case';
import { buildPost } from '../../../../../../test/support/domains/fixtures/post.fixture';

type PostRepositoryMock = {
  get: MockedFunction<PostRepository['get']>;
  findBySourceId: MockedFunction<PostRepository['findBySourceId']>;
  list: MockedFunction<PostRepository['list']>;
  save: MockedFunction<PostRepository['save']>;
};

describe('UpdatePostTitleUseCase', () => {
  it('post title을 새 값으로 변경하고 저장한 후 반환한다', async () => {
    const post = buildPost({ sourceId: 'source-1', title: '기존 제목' });
    const posts = createPostRepositoryMock();
    posts.get.mockResolvedValue(post);
    const useCase = new UpdatePostTitleUseCase(posts);

    const result = await useCase.execute({ postId: post.id, title: '새 제목' });

    expect(result).toMatchObject({
      postId: post.id,
      sourceId: 'source-1',
      title: '새 제목',
    });
    expect(posts.get).toHaveBeenCalledWith({ id: post.id });
    expect(posts.save).toHaveBeenCalledOnce();
  });

  it('post가 없으면 NOT_FOUND exception을 throw한다', async () => {
    const posts = createPostRepositoryMock();
    posts.get.mockResolvedValue(null);
    const useCase = new UpdatePostTitleUseCase(posts);

    await expect(
      useCase.execute({ postId: 'non-existent', title: '새 제목' }),
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
    const useCase = new UpdatePostTitleUseCase(posts);

    await expect(
      useCase.execute({ postId: 'post-1', title: '새 제목' }),
    ).rejects.toBe(getFailure);
    expect(posts.save).not.toHaveBeenCalled();
  });

  it('repository save exception을 전파한다', async () => {
    const saveFailure = new Error('Post Repository operation failed');
    const post = buildPost();
    const posts = createPostRepositoryMock();
    posts.get.mockResolvedValue(post);
    posts.save.mockRejectedValue(saveFailure);
    const useCase = new UpdatePostTitleUseCase(posts);

    await expect(
      useCase.execute({ postId: post.id, title: '새 제목' }),
    ).rejects.toBe(saveFailure);
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
