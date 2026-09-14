import { v7 as newId } from 'uuid';

export interface IntegrationEventParams {
  readonly occurredAt?: Date;
}

export abstract class IntegrationEvent {
  abstract readonly eventType: string;
  abstract readonly eventVersion: number;
  abstract readonly payload: unknown;

  readonly eventId: string;
  readonly occurredAt: Date;

  protected constructor(params: IntegrationEventParams = {}) {
    this.eventId = newId();
    this.occurredAt = params.occurredAt
      ? new Date(params.occurredAt)
      : new Date();
  }
}
