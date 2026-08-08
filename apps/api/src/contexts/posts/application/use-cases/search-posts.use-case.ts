import { Inject, Injectable } from '@nestjs/common';
import {
  type PostQuery,
  type PostQuerySearchCursor,
  type PostQuerySearchResult,
} from '@contexts/posts/application/ports';
import { POST_QUERY } from '@contexts/posts/posts.di-tokens';

export type SearchPostsCommand = {
  readonly query: string;
  readonly cursor: PostQuerySearchCursor | null;
  readonly limit: number;
};

@Injectable()
export class SearchPostsUseCase {
  constructor(
    @Inject(POST_QUERY)
    private readonly postQuery: PostQuery,
  ) {}

  async execute(command: SearchPostsCommand): Promise<PostQuerySearchResult> {
    return this.postQuery.search({
      query: command.query,
      cursor: command.cursor,
      limit: command.limit,
    });
  }
}
