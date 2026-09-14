import { type OutboxEvent } from './outbox-event.base';

export interface OutboxWriter {
  append(event: OutboxEvent): Promise<void>;
}
