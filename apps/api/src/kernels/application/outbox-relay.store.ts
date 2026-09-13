import { type IntegrationEvent } from './integration-event.base';

export interface OutboxRelayStore {
  findPending(limit: number): Promise<IntegrationEvent[]>;
  markPublished(eventId: string): Promise<void>;
}
