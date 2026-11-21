import { OutboxMessage, type OutboxMessageParams } from '@kernels/application';

interface PostPublishedEventParams extends OutboxMessageParams {
  readonly postId: string;
}

export class PostPublishedEvent extends OutboxMessage {
  readonly eventType = 'post.published';
  readonly eventVersion = 1;
  readonly payload: {
    readonly postId: string;
  };

  constructor(params: PostPublishedEventParams) {
    super(params);
    this.payload = { postId: params.postId };
  }
}
