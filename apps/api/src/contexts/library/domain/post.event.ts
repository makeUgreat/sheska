import { DomainEvent, type DomainEventParams } from '@kernels/domain';

export class PostPublishedDomainEvent extends DomainEvent {
  readonly eventName = 'post.published';

  constructor(params: DomainEventParams) {
    super(params);
  }
}

export type PostDomainEvent = PostPublishedDomainEvent;
