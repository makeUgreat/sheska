import { type DomainEvent } from './domain-event.base';
import { Entity } from './entity.base';

export abstract class AggregateRoot<
  EntityProps,
  TDomainEvent extends DomainEvent = DomainEvent,
> extends Entity<EntityProps> {
  private _domainEvents: TDomainEvent[] = [];

  get domainEvents(): readonly TDomainEvent[] {
    return [...this._domainEvents];
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }

  protected addEvent(domainEvent: TDomainEvent): void {
    this._domainEvents.push(domainEvent);
  }
}
