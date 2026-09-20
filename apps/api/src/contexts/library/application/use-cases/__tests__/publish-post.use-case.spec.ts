import { type PostRepository } from '@contexts/library/domain';
import {
  type SourceDocument,
  type SourceLookup,
} from '@contexts/library/application/ports';
import {
  APPLICATION_ERROR_KIND,
  ApplicationException,
} from '@kernels/application';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { PublishPostUseCase } from '../publish-post.use-case';
import { buildPost } from '../../../../../../test/support/domains/fixtures/post.fixture';

type PostRepositoryMock = {
  get: MockedFunction<PostRepository['get']>;
  insert: MockedFunction<PostRepository['insert']>;
  update: MockedFunction<PostRepository['update']>;
};

type SourceLookupMock = {
  get: MockedFunction<SourceLookup['get']>;
  find: MockedFunction<SourceLookup['find']>;
};

const sourceContentWithFrontmatter: SourceDocument = {
  externalSourceId: 'Notes/test.md',
  title: '테스트 포스트',
  body: '본문',
};

const sourceContentWithoutFrontmatter: SourceDocument = {
  externalSourceId: 'Notes/test.md',
  title: 'Notes/test.md',
  body: '본문',
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
    expect(posts.insert).toHaveBeenCalledOnce();
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
    expect(posts.insert).not.toHaveBeenCalled();
  });

  it('이미 발행된 source면 insert가 던진 STATE_CONFLICT를 전파한다', async () => {
    const alreadyPublished = new ApplicationException({
      kind: APPLICATION_ERROR_KIND.STATE_CONFLICT,
      code: 'post.already_exists',
      message: 'A post for this source already exists',
      details: {},
    });
    const posts = createPostRepositoryMock();
    posts.insert.mockRejectedValue(alreadyPublished);
    const sourceLookup = createSourceLookupMock({
      sourceContent: sourceContentWithFrontmatter,
    });
    const useCase = new PublishPostUseCase(posts, sourceLookup);

    await expect(useCase.execute({ sourceId: 'source-1' })).rejects.toBe(
      alreadyPublished,
    );
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
    expect(posts.insert).not.toHaveBeenCalled();
  });

  it('post insert exception을 전파한다', async () => {
    const insertFailure = new Error('Post Repository operation failed');
    const posts = createPostRepositoryMock();
    posts.insert.mockRejectedValue(insertFailure);
    const sourceLookup = createSourceLookupMock({
      sourceContent: sourceContentWithFrontmatter,
    });
    const useCase = new PublishPostUseCase(posts, sourceLookup);

    await expect(useCase.execute({ sourceId: 'source-1' })).rejects.toBe(
      insertFailure,
    );
  });
});

function createPostRepositoryMock(): PostRepositoryMock {
  return {
    get: vi.fn<PostRepository['get']>().mockResolvedValue(buildPost()),
    insert: vi
      .fn<PostRepository['insert']>()
      .mockImplementation((post) => Promise.resolve(post)),
    update: vi
      .fn<PostRepository['update']>()
      .mockImplementation((post) => Promise.resolve(post)),
  };
}

function createSourceLookupMock({
  sourceContent,
}: {
  sourceContent: SourceDocument;
}): SourceLookupMock {
  return {
    get: vi.fn<SourceLookup['get']>().mockResolvedValue(sourceContent),
    find: vi.fn<SourceLookup['find']>().mockResolvedValue(sourceContent),
  };
}
