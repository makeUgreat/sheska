import { computeRetryDelayMs } from '@core/backoff';
import {
  OutboxDeadLetteredIntegrationEvent,
  type ClaimedOutboxMessage,
  type OutboxMessage,
  type OutboxMessageDispatcher,
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
    private readonly dispatcher: OutboxMessageDispatcher,
    private readonly logger: LoggerPort,
    private readonly runtime: OutboxRelayRuntime,
    private readonly options: OutboxRelayOptions,
  ) {}

  async relayPending(): Promise<void> {
    if (this.isRelaying) return;

    this.isRelaying = true;
    try {
      const claimedMessages = await this.store.claimDue(this.options.batchSize, this.options.claimLeaseMs);

      for (const claimed of claimedMessages) {
        await this.relay(claimed);
      }
    } finally {
      this.isRelaying = false;
    }
  }

  private async relay({ message, attemptCount }: ClaimedOutboxMessage): Promise<void> {
    try {
      await this.dispatcher.dispatch(message);
      await this.store.markPublished(message.eventId);
    } catch (error: unknown) {
      const lastFailureReason = toFailureReason(error);

      if (attemptCount >= this.options.maxAttempts) {
        await this.deadLetter(message, attemptCount, lastFailureReason, error);
        return;
      }

      await this.scheduleRetry(message, attemptCount, lastFailureReason, error);
    }
  }

  private async scheduleRetry(message: OutboxMessage, attemptCount: number, lastFailureReason: string, error: unknown): Promise<void> {
    const failedAttemptIndex = attemptCount - 1;
    const delayMs = computeRetryDelayMs(failedAttemptIndex, this.options, this.runtime.random);

    await this.store.scheduleRetry(message.eventId, delayMs, lastFailureReason);
    this.logger.warn('Outbox message relay failed', error, {
      eventId: message.eventId,
      eventType: message.eventType,
      attempt: attemptCount,
      maxAttempts: this.options.maxAttempts,
      delayMs,
      retryAllowed: true,
    });
  }

  private async deadLetter(message: OutboxMessage, attemptCount: number, lastFailureReason: string, error: unknown): Promise<void> {
    await this.store.markDeadLettered(message.eventId, lastFailureReason);
    this.logger.error('Outbox message dead-lettered', error, {
      eventId: message.eventId,
      eventType: message.eventType,
      attempt: attemptCount,
      maxAttempts: this.options.maxAttempts,
      retryAllowed: false,
      retryBlockedReason: 'max_attempts_exhausted',
    });

    await this.notifyDeadLettered(message, attemptCount);
  }

  private async notifyDeadLettered(message: OutboxMessage, attemptCount: number): Promise<void> {
    try {
      await this.dispatcher.dispatch(
        new OutboxDeadLetteredIntegrationEvent({
          deadLetteredEventId: message.eventId,
          deadLetteredEventType: message.eventType,
          deadLetteredPayload: message.payload,
          attemptCount,
        }),
      );
    } catch (error: unknown) {
      this.logger.error('Dead-letter notification failed', error, {
        eventId: message.eventId,
        eventType: message.eventType,
      });
    }
  }
}

function toFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, LAST_FAILURE_REASON_MAX_LENGTH);
}
