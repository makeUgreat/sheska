import { computeRetryDelayMs } from '@core/backoff';
import {
  type ClaimedOutboxMessage,
  type IntegrationEvent,
  type IntegrationEventDispatcher,
  type LoggerPort,
  type OutboxRelayStore,
} from '@kernels/application';
import { type RetryRuntime } from './retry';

const LAST_FAILURE_REASON_MAX_LENGTH = 1_000;

export interface OutboxRelayOptions {
  readonly batchSize: number;
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly claimLeaseMs: number;
}

export type OutboxRelayRuntime = Pick<RetryRuntime, 'random'>;

export class OutboxRelay {
  private isRelaying = false;

  constructor(
    private readonly store: OutboxRelayStore,
    private readonly dispatcher: IntegrationEventDispatcher,
    private readonly logger: LoggerPort,
    private readonly runtime: OutboxRelayRuntime,
    private readonly options: OutboxRelayOptions,
  ) {}

  async relayPending(): Promise<void> {
    if (this.isRelaying) return;

    this.isRelaying = true;
    try {
      const claimedMessages = await this.store.claimDue(
        this.options.batchSize,
        this.options.claimLeaseMs,
      );

      for (const claimed of claimedMessages) {
        await this.relay(claimed);
      }
    } finally {
      this.isRelaying = false;
    }
  }

  private async relay({
    event,
    attemptCount,
  }: ClaimedOutboxMessage): Promise<void> {
    try {
      await this.dispatcher.dispatch(event);
      await this.store.markPublished(event.eventId);
    } catch (error: unknown) {
      const lastFailureReason = toFailureReason(error);

      if (attemptCount >= this.options.maxAttempts) {
        await this.deadLetter(event, attemptCount, lastFailureReason, error);
        return;
      }

      await this.scheduleRetry(event, attemptCount, lastFailureReason, error);
    }
  }

  private async scheduleRetry(
    event: IntegrationEvent,
    attemptCount: number,
    lastFailureReason: string,
    error: unknown,
  ): Promise<void> {
    const failedAttemptIndex = attemptCount - 1;
    const delayMs = computeRetryDelayMs(
      failedAttemptIndex,
      this.options,
      this.runtime.random,
    );

    await this.store.scheduleRetry(event.eventId, delayMs, lastFailureReason);
    this.logger.warn('Integration event relay failed', error, {
      eventId: event.eventId,
      eventType: event.eventType,
      attempt: attemptCount,
      maxAttempts: this.options.maxAttempts,
      delayMs,
      retryAllowed: true,
    });
  }

  private async deadLetter(
    event: IntegrationEvent,
    attemptCount: number,
    lastFailureReason: string,
    error: unknown,
  ): Promise<void> {
    await this.store.markDeadLettered(event.eventId, lastFailureReason);
    this.logger.error('Integration event dead-lettered', error, {
      eventId: event.eventId,
      eventType: event.eventType,
      attempt: attemptCount,
      maxAttempts: this.options.maxAttempts,
      retryAllowed: false,
      retryBlockedReason: 'max_attempts_exhausted',
    });
  }
}

function toFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, LAST_FAILURE_REASON_MAX_LENGTH);
}
