import { type AggregateID } from './entity.base';

export interface DomainEventParams {
  readonly aggregateId: AggregateID;
  readonly occurredAt?: Date;
}

export abstract class DomainEvent<TEventName extends string = string> {
  abstract readonly eventName: TEventName;
  readonly aggregateId: AggregateID;
  readonly occurredAt: Date;

  protected constructor(params: DomainEventParams) {
    this.aggregateId = params.aggregateId;
    this.occurredAt = params.occurredAt
      ? new Date(params.occurredAt)
      : new Date();
  }
}
