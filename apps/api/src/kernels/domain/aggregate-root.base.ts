import { type DomainEvent } from './domain-event.base';
import { Entity, type EntityId } from './entity.base';

type DomainEventByName<
  TDomainEvent extends DomainEvent,
  TEventName extends TDomainEvent['eventName'],
> =
  Extract<TDomainEvent, { readonly eventName: TEventName }> extends never
    ? TDomainEvent
    : Extract<TDomainEvent, { readonly eventName: TEventName }>;

export abstract class AggregateRoot<
  TId extends EntityId,
  EntityProps,
  TDomainEvent extends DomainEvent<TId> = DomainEvent<TId>,
> extends Entity<TId, EntityProps> {
  private _domainEvents: TDomainEvent[] = [];

  get domainEvents(): readonly TDomainEvent[] {
    return [...this._domainEvents];
  }

  findDomainEvent<TEventName extends TDomainEvent['eventName']>(
    eventName: TEventName,
  ): DomainEventByName<TDomainEvent, TEventName> | undefined {
    return this._domainEvents.find(
      (domainEvent) => domainEvent.eventName === eventName,
    ) as DomainEventByName<TDomainEvent, TEventName> | undefined;
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  protected addDomainEvent(domainEvent: TDomainEvent): void {
    this._domainEvents.push(domainEvent);
  }
}
