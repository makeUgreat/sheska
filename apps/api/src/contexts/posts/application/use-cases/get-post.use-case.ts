import { Inject, Injectable } from '@nestjs/common';
import {
  APPLICATION_ERROR_KIND,
  ApplicationException,
} from '@kernels/application';
import { type PostRepository } from '@contexts/posts/domain';
import { POST_REPOSITORY } from '@contexts/posts/posts.di-tokens';

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
}

@Injectable()
export class GetPostUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly posts: PostRepository,
  ) {}

  async execute(command: GetPostCommand): Promise<GetPostResult> {
    const post = await this.posts.get({ id: command.postId });

    if (!post) {
      throw new ApplicationException({
        kind: APPLICATION_ERROR_KIND.NOT_FOUND,
        code: 'posts.post_not_found',
        message: 'Post not found',
        details: {},
      });
    }

    post.incrementViewCount();
    const saved = await this.posts.save(post);
    const props = saved.getProps();

    return {
      postId: saved.id,
      sourceId: props.sourceId,
      title: props.title.unpack(),
      viewCount: props.viewCount.unpack(),
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }
}
