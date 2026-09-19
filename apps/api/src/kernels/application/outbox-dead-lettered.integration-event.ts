import {
  IntegrationEvent,
  type IntegrationEventParams,
} from './integration-event.base';

interface OutboxDeadLetteredIntegrationEventParams extends IntegrationEventParams {
  readonly deadLetteredEventId: string;
  readonly deadLetteredEventType: string;
  readonly deadLetteredPayload: unknown;
  readonly attemptCount: number;
}

export class OutboxDeadLetteredIntegrationEvent extends IntegrationEvent {
  readonly eventType = 'outbox.message.dead_lettered';
  readonly eventVersion = 1;
  readonly payload: {
    readonly deadLetteredEventId: string;
    readonly deadLetteredEventType: string;
    readonly deadLetteredPayload: unknown;
    readonly attemptCount: number;
  };

  constructor(params: OutboxDeadLetteredIntegrationEventParams) {
    super(params);
    this.payload = {
      deadLetteredEventId: params.deadLetteredEventId,
      deadLetteredEventType: params.deadLetteredEventType,
      deadLetteredPayload: params.deadLetteredPayload,
      attemptCount: params.attemptCount,
    };
  }
}
