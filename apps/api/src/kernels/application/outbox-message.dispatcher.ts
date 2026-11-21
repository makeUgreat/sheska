import { type OutboxMessage } from './outbox-message.base';

export const OUTBOX_MESSAGE_DISPATCHER = Symbol('OUTBOX_MESSAGE_DISPATCHER');

export interface OutboxMessageDispatcher {
  dispatch(message: OutboxMessage): Promise<void>;
}
