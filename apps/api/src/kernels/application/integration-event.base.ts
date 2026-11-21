import { OutboxMessage, type OutboxMessageParams } from './outbox-message.base';

export type IntegrationEventParams = OutboxMessageParams;

export abstract class IntegrationEvent extends OutboxMessage {}
