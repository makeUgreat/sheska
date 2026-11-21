import { Inject, Injectable } from '@nestjs/common';
import { type PostRepository } from '@contexts/library/domain';
import { type PostViewQuery, type PostViewQueryCursor, type PostViewQueryPaginateResult } from '@contexts/library/application/ports';
import { POST_REPOSITORY, POST_VIEW_QUERY } from '@contexts/library/library.di-tokens';

export interface ListPostViewsCommand {
  readonly postId: string;
  readonly cursor: PostViewQueryCursor | null;
  readonly limit: number;
}

@Injectable()
export class ListPostViewsUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly posts: PostRepository,
    @Inject(POST_VIEW_QUERY)
    private readonly postViewQuery: PostViewQuery,
  ) {}

  /** post가 없으면 빈 목록 대신 `post.not_found`를 던진다. */
  async execute(command: ListPostViewsCommand): Promise<PostViewQueryPaginateResult> {
    const [, result] = await Promise.all([
      this.posts.get({ id: command.postId }),
      this.postViewQuery.paginate({ postId: command.postId, cursor: command.cursor, limit: command.limit }),
    ]);

    return result;
  }
}
