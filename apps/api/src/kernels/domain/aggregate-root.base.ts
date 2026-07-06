import { type DomainEvent } from './domain-event.base';
import { Entity } from './entity.base';
import { type LoggerPort } from './logger.port';

interface DomainEventPublisher {
  emitAsync(eventName: string, event: DomainEvent): Promise<unknown>;
}

export abstract class AggregateRoot<EntityProps> extends Entity<EntityProps> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): readonly DomainEvent[] {
    return [...this._domainEvents];
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }

  public async publishEvents(
    logger: LoggerPort,
    eventEmitter: DomainEventPublisher,
  ): Promise<void> {
    await Promise.all(
      this._domainEvents.map(async (event) => {
        logger.debug(
          `"${event.eventName}" event published for aggregate ${this.constructor.name}: ${this.id}`,
        );
        return eventEmitter.emitAsync(event.eventName, event);
      }),
    );
    this.clearEvents();
  }

  protected addEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
  }
}
