import { type OutboxMessage } from './outbox-message.base';

export interface ClaimedOutboxMessage {
  readonly message: OutboxMessage;
  readonly attemptCount: number;
}

export interface OutboxRelayStore {
  claimDue(limit: number, leaseMs: number): Promise<ClaimedOutboxMessage[]>;
  markPublished(eventId: string): Promise<void>;
  scheduleRetry(eventId: string, delayMs: number, lastFailureReason: string): Promise<void>;
  markDeadLettered(eventId: string, lastFailureReason: string): Promise<void>;
}
