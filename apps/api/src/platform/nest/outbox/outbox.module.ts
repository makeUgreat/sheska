import { Module } from '@nestjs/common';
import {
  LOGGER,
  type LoggerPort,
  OUTBOX_MESSAGE_DISPATCHER,
  type OutboxMessageDispatcher,
  type OutboxRelayStore,
} from '@kernels/application';
import { OutboxRelay, PgDrizzleOutboxStore, SYSTEM_RETRY_RUNTIME } from '@kernels/infrastructure';
import { OUTBOX_RELAY_RUNNER_OPTIONS, OutboxRelayRunner } from './outbox-relay.runner';
import { OutboxMessageEventEmitterDispatcher } from './outbox-message.event-emitter.dispatcher';

const OUTBOX_RELAY_STORE = Symbol('OUTBOX_RELAY_STORE');

@Module({
  providers: [
    { provide: OUTBOX_RELAY_STORE, useClass: PgDrizzleOutboxStore },
    { provide: OUTBOX_MESSAGE_DISPATCHER, useClass: OutboxMessageEventEmitterDispatcher },
    {
      provide: OutboxRelay,
      useFactory: (store: OutboxRelayStore, dispatcher: OutboxMessageDispatcher, logger: LoggerPort) =>
        new OutboxRelay(store, dispatcher, logger, SYSTEM_RETRY_RUNTIME, {
          batchSize: 100,
          maxAttempts: 14,
          baseDelayMs: 1_000,
          maxDelayMs: 600_000,
          claimLeaseMs: 30_000,
        }),
      inject: [OUTBOX_RELAY_STORE, OUTBOX_MESSAGE_DISPATCHER, LOGGER],
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
