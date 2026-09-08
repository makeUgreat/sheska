import { type PostRepository } from '@contexts/posts/domain';
import {
  type PublishableSourceContent,
  type SourceLookup,
} from '@contexts/posts/application/ports';
import { APPLICATION_ERROR_KIND } from '@kernels/application';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { PublishPostUseCase } from '../publish-post.use-case';
import { buildPost } from '../../../../../../test/support/domains/fixtures/post.fixture';

type PostRepositoryMock = {
  get: MockedFunction<PostRepository['get']>;
  find: MockedFunction<PostRepository['find']>;
  save: MockedFunction<PostRepository['save']>;
};

type SourceLookupMock = {
  get: MockedFunction<SourceLookup['get']>;
  find: MockedFunction<SourceLookup['find']>;
};

const sourceContentWithFrontmatter: PublishableSourceContent = {
  content: '---\ntitle: 테스트 포스트\n---\n본문',
  externalSourceId: 'Notes/test.md',
};

const sourceContentWithoutFrontmatter: PublishableSourceContent = {
  content: '# 프론트매터 없는 마크다운',
  externalSourceId: 'Notes/test.md',
};

describe('PublishPostUseCase', () => {
  it('source가 존재하고 post가 없으면 프론트매터 title로 post를 생성하고 저장한다', async () => {
    const posts = createPostRepositoryMock();
    const sourceLookup = createSourceLookupMock({
      sourceContent: sourceContentWithFrontmatter,
    });
    const useCase = new PublishPostUseCase(posts, sourceLookup);

    const result = await useCase.execute({ sourceId: 'source-1' });

    expect(result).toMatchObject({
      sourceId: 'source-1',
      title: '테스트 포스트',
      viewCount: 0,
    });
    expect(result.postId.length).toBeGreaterThan(0);
    expect(sourceLookup.get).toHaveBeenCalledWith('source-1');
    expect(posts.find).toHaveBeenCalledWith({ sourceId: 'source-1' });
    expect(posts.save).toHaveBeenCalledOnce();
  });

  it('프론트매터 title이 없으면 externalSourceId를 title로 사용한다', async () => {
    const posts = createPostRepositoryMock();
    const sourceLookup = createSourceLookupMock({
      sourceContent: sourceContentWithoutFrontmatter,
    });
    const useCase = new PublishPostUseCase(posts, sourceLookup);

    const result = await useCase.execute({ sourceId: 'source-1' });

    expect(result.title).toBe('Notes/test.md');
  });

  it('source가 없으면 sourceLookup.get이 throw한 exception을 전파한다', async () => {
    const notFoundError = new Error('Source not found');
    const posts = createPostRepositoryMock();
    const sourceLookup = createSourceLookupMock({
      sourceContent: sourceContentWithFrontmatter,
    });
    sourceLookup.get.mockRejectedValue(notFoundError);
    const useCase = new PublishPostUseCase(posts, sourceLookup);

    await expect(useCase.execute({ sourceId: 'non-existent' })).rejects.toBe(
      notFoundError,
    );
    expect(posts.find).not.toHaveBeenCalled();
    expect(posts.save).not.toHaveBeenCalled();
  });

  it('같은 sourceId로 이미 post가 있으면 STATE_CONFLICT exception을 throw한다', async () => {
    const existingPost = buildPost({ sourceId: 'source-1' });
    const posts = createPostRepositoryMock();
    posts.find.mockResolvedValue(existingPost);
    const sourceLookup = createSourceLookupMock({
      sourceContent: sourceContentWithFrontmatter,
    });
    const useCase = new PublishPostUseCase(posts, sourceLookup);

    await expect(
      useCase.execute({ sourceId: 'source-1' }),
    ).rejects.toMatchObject({
      kind: APPLICATION_ERROR_KIND.STATE_CONFLICT,
      code: 'posts.source_already_published',
    });
    expect(posts.save).not.toHaveBeenCalled();
  });

  it('sourceLookup exception을 전파한다', async () => {
    const lookupFailure = new Error('Source lookup failed');
    const posts = createPostRepositoryMock();
    const sourceLookup = createSourceLookupMock({
      sourceContent: sourceContentWithFrontmatter,
    });
    sourceLookup.get.mockRejectedValue(lookupFailure);
    const useCase = new PublishPostUseCase(posts, sourceLookup);

    await expect(useCase.execute({ sourceId: 'source-1' })).rejects.toBe(
      lookupFailure,
    );
    expect(posts.save).not.toHaveBeenCalled();
  });

  it('post 조회 exception을 전파한다', async () => {
    const findFailure = new Error('Post Repository operation failed');
    const posts = createPostRepositoryMock();
    posts.find.mockRejectedValue(findFailure);
    const sourceLookup = createSourceLookupMock({
      sourceContent: sourceContentWithFrontmatter,
    });
    const useCase = new PublishPostUseCase(posts, sourceLookup);

    await expect(useCase.execute({ sourceId: 'source-1' })).rejects.toBe(
      findFailure,
    );
    expect(posts.save).not.toHaveBeenCalled();
  });

  it('post 저장 exception을 전파한다', async () => {
    const saveFailure = new Error('Post Repository operation failed');
    const posts = createPostRepositoryMock();
    posts.save.mockRejectedValue(saveFailure);
    const sourceLookup = createSourceLookupMock({
      sourceContent: sourceContentWithFrontmatter,
    });
    const useCase = new PublishPostUseCase(posts, sourceLookup);

    await expect(useCase.execute({ sourceId: 'source-1' })).rejects.toBe(
      saveFailure,
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

function createSourceLookupMock({
  sourceContent,
}: {
  sourceContent: PublishableSourceContent;
}): SourceLookupMock {
  return {
    get: vi.fn<SourceLookup['get']>().mockResolvedValue(sourceContent),
    find: vi.fn<SourceLookup['find']>().mockResolvedValue(sourceContent),
  };
}
