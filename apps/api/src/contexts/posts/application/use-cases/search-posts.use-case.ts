import { Inject, Injectable } from '@nestjs/common';
import { type CallContext } from '@core/call-context';
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

// Own attempt-timeout ceiling for the search query embed call, independent of
// the adapter's internal default (application code must not import an
// infrastructure constant). Same order of magnitude as the adapter's
// SEARCH_QUERY_EMBED_TIMEOUT_MS: interactive search should feel snappy, and
// measured warm-state embedding latency is ~470-500ms.
export const SEARCH_QUERY_EMBED_ATTEMPT_TIMEOUT_MS = 1_000;

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

  async execute(
    command: SearchPostsCommand,
    context: CallContext,
  ): Promise<SearchPostsResult> {
    const queryEmbedding = await this.searchQueryEmbedder.embed(
      command.query,
      context,
      SEARCH_QUERY_EMBED_ATTEMPT_TIMEOUT_MS,
    );

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
