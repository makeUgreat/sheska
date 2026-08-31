import { Inject, Injectable } from '@nestjs/common';
import {
  type PostQuery,
  type PostQuerySearchCursor,
  type PostQuerySearchResult,
  type SearchQueryEmbedder,
} from '@contexts/posts/application/ports';
import {
  POST_QUERY,
  SEARCH_QUERY_EMBEDDER,
} from '@contexts/posts/posts.di-tokens';

export type SearchPostsCommand = {
  readonly query: string;
  readonly cursor: PostQuerySearchCursor | null;
  readonly limit: number;
};

export type SearchPostsResult = PostQuerySearchResult & {
  readonly semanticSearchApplied: boolean;
};

@Injectable()
export class SearchPostsUseCase {
  constructor(
    @Inject(POST_QUERY)
    private readonly postQuery: PostQuery,
    @Inject(SEARCH_QUERY_EMBEDDER)
    private readonly searchQueryEmbedder: SearchQueryEmbedder,
  ) {}

  async execute(command: SearchPostsCommand): Promise<SearchPostsResult> {
    const queryEmbedding = await this.searchQueryEmbedder.embed(command.query);

    const result = await this.postQuery.search({
      query: command.query,
      cursor: command.cursor,
      limit: command.limit,
      queryEmbedding,
    });

    return {
      ...result,
      semanticSearchApplied: queryEmbedding !== null,
    };
  }
}
