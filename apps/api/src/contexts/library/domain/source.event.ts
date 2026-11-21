import { DomainEvent, type DomainEventParams } from '@kernels/domain';

export class SourceBodyChangedDomainEvent extends DomainEvent {
  readonly eventName = 'source.body_changed';

  constructor(params: DomainEventParams) {
    super(params);
  }
}

export type SourceDomainEvent = SourceBodyChangedDomainEvent;
