import { Inject, Injectable } from '@nestjs/common';
import { type PostRepository } from '@contexts/posts/domain';
import { POST_REPOSITORY } from '@contexts/posts/posts.di-tokens';

export interface UpdatePostTitleCommand {
  readonly postId: string;
  readonly title: string;
}

export interface UpdatePostTitleResult {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly viewCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

@Injectable()
export class UpdatePostTitleUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly posts: PostRepository,
  ) {}

  async execute(
    command: UpdatePostTitleCommand,
  ): Promise<UpdatePostTitleResult> {
    const post = await this.posts.get({ id: command.postId });
    post.updateTitle(command.title);
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
