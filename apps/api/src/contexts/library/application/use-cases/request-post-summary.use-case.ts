import { Inject, Injectable } from '@nestjs/common';
import { type PostQuery, type PostSummaryJobDispatcher } from '@contexts/library/application/ports';
import { SourceFingerprint } from '@contexts/library/domain';
import { POST_QUERY, POST_SUMMARY_JOB_DISPATCHER } from '@contexts/library/library.di-tokens';

export interface RequestPostSummaryCommand {
  readonly postId: string;
}

@Injectable()
export class RequestPostSummaryUseCase {
  constructor(
    @Inject(POST_QUERY)
    private readonly posts: PostQuery,
    @Inject(POST_SUMMARY_JOB_DISPATCHER)
    private readonly dispatcher: PostSummaryJobDispatcher,
  ) {}

  async execute(command: RequestPostSummaryCommand): Promise<void> {
    const post = await this.posts.find({ id: command.postId });
    if (!post) return;

    const fingerprint = SourceFingerprint.ofBody(post.body).unpack();

    await this.dispatcher.dispatch({ postId: post.postId, fingerprint });
  }
}
