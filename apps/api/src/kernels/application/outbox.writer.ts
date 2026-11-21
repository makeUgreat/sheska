import { type OutboxMessage } from './outbox-message.base';

export interface OutboxWriter {
  append(message: OutboxMessage): Promise<void>;
}
