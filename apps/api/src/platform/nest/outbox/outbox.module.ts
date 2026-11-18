import { Module } from '@nestjs/common';
import {
  INTEGRATION_EVENT_DISPATCHER,
  type IntegrationEventDispatcher,
  LOGGER,
  type LoggerPort,
  type OutboxRelayStore,
} from '@kernels/application';
import {
  OutboxRelay,
  PgDrizzleOutboxStore,
  SYSTEM_RETRY_RUNTIME,
} from '@kernels/infrastructure';
import {
  OUTBOX_RELAY_RUNNER_OPTIONS,
  OutboxRelayRunner,
} from './outbox-relay.runner';
import { IntegrationEventsModule } from '../events/integration-events.module';

const OUTBOX_RELAY_STORE = Symbol('OUTBOX_RELAY_STORE');

@Module({
  imports: [IntegrationEventsModule],
  providers: [
    { provide: OUTBOX_RELAY_STORE, useClass: PgDrizzleOutboxStore },
    {
      provide: OutboxRelay,
      useFactory: (
        store: OutboxRelayStore,
        dispatcher: IntegrationEventDispatcher,
        logger: LoggerPort,
      ) =>
        new OutboxRelay(store, dispatcher, logger, SYSTEM_RETRY_RUNTIME, {
          batchSize: 100,
          maxAttempts: 14,
          baseDelayMs: 1_000,
          maxDelayMs: 600_000,
          claimLeaseMs: 30_000,
        }),
      inject: [OUTBOX_RELAY_STORE, INTEGRATION_EVENT_DISPATCHER, LOGGER],
    },
    {
      provide: OUTBOX_RELAY_RUNNER_OPTIONS,
      useValue: { pollIntervalMs: 1_000 },
    },
    OutboxRelayRunner,
  ],
  exports: [OutboxRelay],
})
export class OutboxModule {}
