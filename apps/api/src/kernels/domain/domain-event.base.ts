import { type EntityId } from './entity.base';

export interface DomainEventParams<TAggregateId extends EntityId = EntityId> {
  readonly aggregateId: TAggregateId;
  readonly occurredAt?: Date;
}

export abstract class DomainEvent<
  TAggregateId extends EntityId = EntityId,
  TEventName extends string = string,
> {
  abstract readonly eventName: TEventName;
  readonly aggregateId: TAggregateId;
  readonly occurredAt: Date;

  protected constructor(params: DomainEventParams<TAggregateId>) {
    this.aggregateId = params.aggregateId;
    this.occurredAt = params.occurredAt
      ? new Date(params.occurredAt)
      : new Date();
  }
}
