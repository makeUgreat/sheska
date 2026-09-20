import { Inject, Injectable } from '@nestjs/common';
import {
  type PostQuery,
  type PostQueryCursor,
  type PostQueryPaginateResult,
} from '@contexts/library/application/ports';
import { POST_QUERY } from '@contexts/library/library.di-tokens';

export interface ListPostsCommand {
  readonly cursor: PostQueryCursor | null;
  readonly limit: number;
}

@Injectable()
export class ListPostsUseCase {
  constructor(
    @Inject(POST_QUERY)
    private readonly postQuery: PostQuery,
  ) {}

  async execute(command: ListPostsCommand): Promise<PostQueryPaginateResult> {
    return this.postQuery.paginate({
      limit: command.limit,
      cursor: command.cursor,
    });
  }
}
