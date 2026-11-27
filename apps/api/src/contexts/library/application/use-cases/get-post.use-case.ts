import { Inject, Injectable } from '@nestjs/common';
import { type PostQuery, type PostQuerySeriesWithPosts, type PostQuerySummary } from '@contexts/library/application/ports';
import { POST_QUERY } from '@contexts/library/library.di-tokens';

export interface GetPostCommand {
  readonly postId: string;
}

export interface GetPostResult {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly body: string;
  readonly viewCount: number;
  readonly summary: PostQuerySummary;
  readonly series: PostQuerySeriesWithPosts | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

@Injectable()
export class GetPostUseCase {
  constructor(
    @Inject(POST_QUERY)
    private readonly postQuery: PostQuery,
  ) {}

  async execute(command: GetPostCommand): Promise<GetPostResult> {
    return this.postQuery.get({ id: command.postId });
  }
}
