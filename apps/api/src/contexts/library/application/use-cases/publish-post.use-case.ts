import { Inject, Injectable } from '@nestjs/common';

import { Post } from '@contexts/library/domain';
import { LIBRARY_UNIT_OF_WORK, SOURCE_LOOKUP } from '@contexts/library/library.di-tokens';
import { type LibraryUnitOfWork, type SourceLookup } from '@contexts/library/application/ports';
import { PostPublishedEvent } from '@contexts/library/application/events/post-published.outbox-message';

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
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly unitOfWork: LibraryUnitOfWork,
    @Inject(SOURCE_LOOKUP)
    private readonly sourceLookup: SourceLookup,
  ) {}

  async execute(command: PublishPostCommand): Promise<PublishPostResult> {
    const source = await this.sourceLookup.get(command.sourceId);

    const post = Post.create({
      sourceId: command.sourceId,
    });

    const saved = await this.unitOfWork.execute(async ({ posts, outbox }) => {
      const inserted = await posts.insert(post);
      for (const message of this.toPostPublishedEvents(post)) {
        await outbox.append(message);
      }
      return inserted;
    });
    post.clearDomainEvents();
    const props = saved.getProps();

    return {
      postId: saved.id,
      sourceId: saved.sourceId,
      title: source.title,
      viewCount: props.viewCount.unpack(),
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  private toPostPublishedEvents(post: Post): PostPublishedEvent[] {
    return post.domainEvents.map(
      (event) =>
        new PostPublishedEvent({
          occurredAt: event.occurredAt,
          postId: event.aggregateId,
        }),
    );
  }
}
