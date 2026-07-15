import { Inject, Injectable } from '@nestjs/common';
import {
  APPLICATION_ERROR_KIND,
  ApplicationException,
} from '@kernels/application';
import { Post, type PostRepository } from '@contexts/posts/domain';
import {
  POST_REPOSITORY,
  SOURCE_LOOKUP,
} from '@contexts/posts/posts.di-tokens';
import { type SourceLookup } from '@contexts/posts/application/ports';
import { extractFrontmatterTitle } from '../extract-frontmatter-title';

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
    const sourceInfo = await this.sourceLookup.find(command.sourceId);

    if (!sourceInfo) {
      throw new ApplicationException({
        kind: APPLICATION_ERROR_KIND.NOT_FOUND,
        code: 'posts.source_not_found',
        message: 'Source not found',
        details: {},
      });
    }

    const existing = await this.posts.findBySourceId(command.sourceId);

    if (existing) {
      throw new ApplicationException({
        kind: APPLICATION_ERROR_KIND.STATE_CONFLICT,
        code: 'posts.source_already_published',
        message: 'This source already has a published post',
        details: {},
      });
    }

    const derivedTitle =
      extractFrontmatterTitle(sourceInfo.content) ??
      sourceInfo.externalSourceId;

    const post = Post.create({
      sourceId: command.sourceId,
      title: derivedTitle,
    });

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
