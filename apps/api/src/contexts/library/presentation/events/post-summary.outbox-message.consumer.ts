import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RequestPostSummaryUseCase } from '@contexts/library/application/use-cases/post-summary/request-post-summary.use-case';
import { postPublishedOutboxMessageSchema, sourceBodyChangedOutboxMessageSchema } from './dto/post-summary.outbox-message.dto';

@Injectable()
export class PostSummaryOutboxMessageConsumer {
  constructor(
    @Inject(RequestPostSummaryUseCase)
    private readonly requestPostSummary: RequestPostSummaryUseCase,
  ) {}

  @OnEvent('post.published')
  async onPostPublished(message: unknown): Promise<void> {
    const { payload } = postPublishedOutboxMessageSchema.parse(message);
    await this.requestPostSummary.execute({ postId: payload.postId });
  }

  @OnEvent('source.body_changed')
  async onSourceBodyChanged(message: unknown): Promise<void> {
    const { payload } = sourceBodyChangedOutboxMessageSchema.parse(message);
    await this.requestPostSummary.execute({ postId: payload.sourceId });
  }
}
