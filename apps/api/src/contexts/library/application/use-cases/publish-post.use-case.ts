import { Inject, Injectable } from '@nestjs/common';
import {
  APPLICATION_ERROR_KIND,
  ApplicationException,
} from '@kernels/application';
import { Post, type PostRepository } from '@contexts/library/domain';
import {
  POST_REPOSITORY,
  SOURCE_LOOKUP,
} from '@contexts/library/library.di-tokens';
import { type SourceLookup } from '@contexts/library/application/ports';

export interface PublishPostCommand {
  readonly sourceId: string;
}

export interface PublishPostResult {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly viewCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

@Injectable()
export class PublishPostUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly posts: PostRepository,
    @Inject(SOURCE_LOOKUP)
    private readonly sourceLookup: SourceLookup,
  ) {}

  async execute(command: PublishPostCommand): Promise<PublishPostResult> {
    const source = await this.sourceLookup.get(command.sourceId);

    const existing = await this.posts.find({ sourceId: command.sourceId });

    if (existing) {
      throw new ApplicationException({
        kind: APPLICATION_ERROR_KIND.STATE_CONFLICT,
        code: 'posts.source_already_published',
        message: 'This source already has a published post',
        details: {},
      });
    }

    const post = Post.create({
      sourceId: command.sourceId,
    });

    const saved = await this.posts.save(post);
    const props = saved.getProps();

    return {
      postId: saved.id,
      sourceId: props.sourceId,
      title: source.title,
      viewCount: props.viewCount.unpack(),
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }
}
