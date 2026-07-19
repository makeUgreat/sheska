import { Inject, Injectable } from '@nestjs/common';
import {
  type PostQuery,
  type PostQueryCursor,
  type PostQueryPaginateResult,
} from '@contexts/posts/application/ports';
import { POST_QUERY } from '@contexts/posts/posts.di-tokens';

export interface ListPostsCommand {
  readonly cursor?: PostQueryCursor;
  readonly limit?: number;
}

@Injectable()
export class ListPostsUseCase {
  constructor(
    @Inject(POST_QUERY)
    private readonly postQuery: PostQuery,
  ) {}

  async execute(
    command: ListPostsCommand = {},
  ): Promise<PostQueryPaginateResult> {
    return this.postQuery.paginate({
      limit: command.limit ?? 20,
      cursor: command.cursor,
    });
  }
}
