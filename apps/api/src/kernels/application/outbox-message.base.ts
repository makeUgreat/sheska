import { newId } from '@core/id';

export interface OutboxMessageParams {
  readonly occurredAt?: Date;
}

export abstract class OutboxMessage {
  abstract readonly eventType: string;
  abstract readonly eventVersion: number;
  abstract readonly payload: unknown;

  readonly eventId: string;
  readonly occurredAt: Date;

  protected constructor(params: OutboxMessageParams = {}) {
    this.eventId = newId();
    this.occurredAt = params.occurredAt ? new Date(params.occurredAt) : new Date();
  }
}
