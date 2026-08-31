import {
  type PostQuery,
  type PostQueryPaginateResult,
  type PostQuerySearchResult,
  type SearchQueryEmbedder,
} from '@contexts/posts/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { SearchPostsUseCase } from '../search-posts.use-case';

type PostQueryMock = {
  get: MockedFunction<PostQuery['get']>;
  find: MockedFunction<PostQuery['find']>;
  paginate: MockedFunction<PostQuery['paginate']>;
  search: MockedFunction<PostQuery['search']>;
  count: MockedFunction<PostQuery['count']>;
};

type SearchQueryEmbedderMock = {
  embed: MockedFunction<SearchQueryEmbedder['embed']>;
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

function buildSearchResult(
  overrides: Partial<PostQuerySearchResult> = {},
): PostQuerySearchResult {
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
      buildSearchResult({
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
    const searchQueryEmbedder = createSearchQueryEmbedderMock();
    const useCase = new SearchPostsUseCase(postQuery, searchQueryEmbedder);

    const result = await useCase.execute({
      query: 'TypeScript',
      cursor: null,
      limit: 20,
    });

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0]).toMatchObject({
      postId: 'post-1',
      sourceId: 'source-1',
      title: 'TypeScript 입문',
      viewCount: 0,
    });
    expect(postQuery.search).toHaveBeenCalledWith({
      query: 'TypeScript',
      cursor: null,
      limit: 20,
      queryEmbedding: null,
    });
  });

  it('일치하는 post가 없으면 빈 배열을 반환한다', async () => {
    const postQuery = createPostQueryMock();
    postQuery.search.mockResolvedValue(buildSearchResult());
    const searchQueryEmbedder = createSearchQueryEmbedderMock();
    const useCase = new SearchPostsUseCase(postQuery, searchQueryEmbedder);

    const result = await useCase.execute({
      query: 'nothing',
      cursor: null,
      limit: 20,
    });

    expect(result.posts).toHaveLength(0);
  });

  it('postQuery search exception을 전파한다', async () => {
    const searchFailure = new Error('Post Query operation failed');
    const postQuery = createPostQueryMock();
    postQuery.search.mockRejectedValue(searchFailure);
    const searchQueryEmbedder = createSearchQueryEmbedderMock();
    const useCase = new SearchPostsUseCase(postQuery, searchQueryEmbedder);

    await expect(
      useCase.execute({ query: 'TypeScript', cursor: null, limit: 20 }),
    ).rejects.toBe(searchFailure);
  });

  it('쿼리 임베딩이 성공하면 queryEmbedding을 전달하고 semanticSearchApplied를 true로 반환한다', async () => {
    const postQuery = createPostQueryMock();
    postQuery.search.mockResolvedValue(buildSearchResult());
    const searchQueryEmbedder = createSearchQueryEmbedderMock();
    const embedding = [0.1, 0.2, 0.3];
    searchQueryEmbedder.embed.mockResolvedValue(embedding);
    const useCase = new SearchPostsUseCase(postQuery, searchQueryEmbedder);

    const result = await useCase.execute({
      query: 'TypeScript',
      cursor: null,
      limit: 20,
    });

    expect(postQuery.search).toHaveBeenCalledWith({
      query: 'TypeScript',
      cursor: null,
      limit: 20,
      queryEmbedding: embedding,
    });
    expect(result.semanticSearchApplied).toBe(true);
  });

  it('쿼리 임베딩이 실패(null)하면 FTS-only로 폴백하고 semanticSearchApplied를 false로 반환한다', async () => {
    const postQuery = createPostQueryMock();
    postQuery.search.mockResolvedValue(buildSearchResult());
    const searchQueryEmbedder = createSearchQueryEmbedderMock();
    searchQueryEmbedder.embed.mockResolvedValue(null);
    const useCase = new SearchPostsUseCase(postQuery, searchQueryEmbedder);

    const result = await useCase.execute({
      query: 'TypeScript',
      cursor: null,
      limit: 20,
    });

    expect(postQuery.search).toHaveBeenCalledWith({
      query: 'TypeScript',
      cursor: null,
      limit: 20,
      queryEmbedding: null,
    });
    expect(result.semanticSearchApplied).toBe(false);
  });
});

function createPostQueryMock(): PostQueryMock {
  return {
    get: vi.fn<PostQuery['get']>().mockResolvedValue(null as never),
    find: vi.fn<PostQuery['find']>().mockResolvedValue(null),
    paginate: vi
      .fn<PostQuery['paginate']>()
      .mockResolvedValue(buildPaginateResult()),
    search: vi.fn<PostQuery['search']>().mockResolvedValue(buildSearchResult()),
    count: vi.fn<PostQuery['count']>().mockResolvedValue(0),
  };
}

function createSearchQueryEmbedderMock(): SearchQueryEmbedderMock {
  return {
    embed: vi.fn<SearchQueryEmbedder['embed']>().mockResolvedValue(null),
  };
}
