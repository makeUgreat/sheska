import { Inject, Injectable } from '@nestjs/common';
import { type CallContext, type CallPolicy } from '@core/call-context';
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

// Interactive search should feel snappy. Measured warm-state embedding
// latency is ~470-500ms, so both budgets leave limited headroom.
export const SEARCH_POSTS_CALL_POLICY = {
  deadlineMs: 1_000,
  attemptTimeoutMs: 1_000,
} as const satisfies CallPolicy;

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
