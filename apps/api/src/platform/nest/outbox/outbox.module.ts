import { Module } from '@nestjs/common';
import {
  INTEGRATION_EVENT_DISPATCHER,
  type IntegrationEventDispatcher,
  LOGGER,
  type LoggerPort,
  type OutboxRelayStore,
} from '@kernels/application';
import {
  DATABASE_TOKENS,
  OutboxRelay,
  PgDrizzleOutboxStore,
} from '@kernels/infrastructure';
import { type ApiDrizzleDatabase } from '../database/drizzle-postgres.provider';
import {
  OUTBOX_RELAY_RUNNER_OPTIONS,
  OutboxRelayRunner,
} from './outbox-relay.runner';
import { IntegrationEventsModule } from '../events/integration-events.module';

const OUTBOX_RELAY_STORE = Symbol('OUTBOX_RELAY_STORE');

@Module({
  imports: [IntegrationEventsModule],
  providers: [
    {
      provide: OUTBOX_RELAY_STORE,
      useFactory: (database: ApiDrizzleDatabase): OutboxRelayStore =>
        new PgDrizzleOutboxStore(database),
      inject: [DATABASE_TOKENS.drizzleDatabase],
    },
    {
      provide: OutboxRelay,
      useFactory: (
        store: OutboxRelayStore,
        dispatcher: IntegrationEventDispatcher,
        logger: LoggerPort,
      ) => new OutboxRelay(store, dispatcher, logger, { batchSize: 100 }),
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
