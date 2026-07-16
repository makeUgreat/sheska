import { Inject, Injectable } from '@nestjs/common';
import { type PostRepository } from '@contexts/posts/domain';
import { type PostQuery } from '@contexts/posts/application/ports';
import { POST_QUERY, POST_REPOSITORY } from '@contexts/posts/posts.di-tokens';

export interface GetPostCommand {
  readonly postId: string;
}

export interface GetPostResult {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly viewCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly sourceContent: string;
}

@Injectable()
export class GetPostUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly posts: PostRepository,
    @Inject(POST_QUERY)
    private readonly postQuery: PostQuery,
  ) {}
  // todo: view increment 로직 부하테스트 후 개선
  async execute(command: GetPostCommand): Promise<GetPostResult> {
    const post = await this.posts.get({ id: command.postId });
    post.incrementViewCount();
    const saved = await this.posts.save(post);
    return this.postQuery.get({ id: saved.id });
  }
}
