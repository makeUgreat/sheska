import { Inject, Injectable } from '@nestjs/common';
import { PostView, PostViewClient, type PostRepository, type PostViewRepository } from '@contexts/library/domain';
import { POST_REPOSITORY, POST_VIEW_REPOSITORY } from '@contexts/library/library.di-tokens';

export interface RecordPostViewCommand {
  readonly postId: string;
  readonly ip: string;
  readonly userAgent: string | undefined;
}

@Injectable()
export class RecordPostViewUseCase {
  constructor(
    @Inject(POST_REPOSITORY)
    private readonly posts: PostRepository,
    @Inject(POST_VIEW_REPOSITORY)
    private readonly postViews: PostViewRepository,
  ) {}

  // 의도적으로 동시성 문제를 허용함
  async execute(command: RecordPostViewCommand): Promise<void> {
    const view = PostView.of({
      postId: command.postId,
      ip: command.ip,
      client: PostViewClient.of(command.userAgent),
      viewedAt: new Date(),
    });
    const [post, latest] = await Promise.all([
      this.posts.get({ id: command.postId }),
      this.postViews.findLatest({ postId: command.postId, ip: command.ip }),
    ]);
    if (!view.countsAfter(latest)) return;

    post.incrementViewCount();

    await Promise.all([this.postViews.insert(view), this.posts.update(post)]);
  }
}
