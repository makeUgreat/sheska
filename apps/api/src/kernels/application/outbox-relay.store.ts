import { type IntegrationEvent } from './integration-event.base';

export interface ClaimedOutboxMessage {
  readonly event: IntegrationEvent;
  readonly attemptCount: number;
}

export interface OutboxRelayStore {
  claimDue(limit: number, leaseMs: number): Promise<ClaimedOutboxMessage[]>;
  markPublished(eventId: string): Promise<void>;
  scheduleRetry(
    eventId: string,
    delayMs: number,
    lastFailureReason: string,
  ): Promise<void>;
  markDeadLettered(eventId: string, lastFailureReason: string): Promise<void>;
}
