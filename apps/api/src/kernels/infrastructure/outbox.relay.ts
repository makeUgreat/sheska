import {
  type IntegrationEvent,
  type IntegrationEventDispatcher,
  type LoggerPort,
  type OutboxRelayStore,
} from '@kernels/application';

export interface OutboxRelayOptions {
  readonly batchSize: number;
}

export class OutboxRelay {
  private isRelaying = false;

  constructor(
    private readonly store: OutboxRelayStore,
    private readonly dispatcher: IntegrationEventDispatcher,
    private readonly logger: LoggerPort,
    private readonly options: OutboxRelayOptions,
  ) {}

  async relayPending(): Promise<void> {
    if (this.isRelaying) return;

    this.isRelaying = true;
    try {
      const pendingEvents = await this.store.findPending(
        this.options.batchSize,
      );

      for (const event of pendingEvents) {
        await this.relay(event);
      }
    } finally {
      this.isRelaying = false;
    }
  }

  private async relay(event: IntegrationEvent): Promise<void> {
    try {
      await this.dispatcher.dispatch(event);
      await this.store.markPublished(event.eventId);
    } catch (error: unknown) {
      this.logger.error('Integration event relay failed', error, {
        eventId: event.eventId,
        eventType: event.eventType,
      });
    }
  }
}
