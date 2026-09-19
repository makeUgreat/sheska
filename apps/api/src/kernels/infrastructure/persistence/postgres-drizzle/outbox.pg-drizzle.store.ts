import { and, asc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import {
  type ClaimedOutboxMessage,
  type IntegrationEvent,
  type OutboxRelayStore,
  type OutboxWriter,
} from '@kernels/application';
import { InfrastructureException } from '../../infrastructure.exception';
import { type PgDrizzleSession } from '../../pg-drizzle.session';
import { classifyPostgresError } from '../../postgres-error.classifier';
import * as outboxSchema from './outbox.pg-drizzle.schema';

const ADAPTER = 'outbox.pg-drizzle';

export class PgDrizzleOutboxStore implements OutboxWriter, OutboxRelayStore {
  constructor(private readonly db: PgDrizzleSession<typeof outboxSchema>) {}

  async append(event: IntegrationEvent): Promise<void> {
    try {
      await this.db.insert(outboxSchema.outboxMessages).values({
        eventId: event.eventId,
        eventType: event.eventType,
        eventVersion: event.eventVersion,
        payload: event.payload,
        occurredAt: event.occurredAt,
      });
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'outbox.append_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Outbox append operation failed',
        details: {
          eventId: event.eventId,
          eventType: event.eventType,
        },
        cause: error,
      });
    }
  }

  async claimDue(
    limit: number,
    leaseMs: number,
  ): Promise<ClaimedOutboxMessage[]> {
    try {
      const dueEventIds = this.db
        .select({ eventId: outboxSchema.outboxMessages.eventId })
        .from(outboxSchema.outboxMessages)
        .where(
          and(
            isNull(outboxSchema.outboxMessages.publishedAt),
            isNull(outboxSchema.outboxMessages.deadLetteredAt),
            lte(outboxSchema.outboxMessages.nextAttemptAt, sql`now()`),
          ),
        )
        .orderBy(
          asc(outboxSchema.outboxMessages.createdAt),
          asc(outboxSchema.outboxMessages.eventId),
        )
        .limit(limit)
        .for('update', { skipLocked: true });

      const rows = await this.db
        .update(outboxSchema.outboxMessages)
        .set({
          attemptCount: sql`${outboxSchema.outboxMessages.attemptCount} + 1`,
          nextAttemptAt: sql`now() + make_interval(secs => ${leaseMs}::float8 / 1000.0)`,
        })
        .where(inArray(outboxSchema.outboxMessages.eventId, dueEventIds))
        .returning();

      return rows.sort(byClaimOrder).map((row) => ({
        event: {
          eventId: row.eventId,
          eventType: row.eventType,
          eventVersion: row.eventVersion,
          occurredAt: row.occurredAt,
          payload: row.payload,
        },
        attemptCount: row.attemptCount,
      }));
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'outbox.claim_due_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Outbox due event claim failed',
        details: {},
        cause: error,
      });
    }
  }

  async markPublished(eventId: string): Promise<void> {
    try {
      await this.db
        .update(outboxSchema.outboxMessages)
        .set({ publishedAt: sql`now()` })
        .where(
          and(
            eq(outboxSchema.outboxMessages.eventId, eventId),
            isNull(outboxSchema.outboxMessages.publishedAt),
          ),
        );
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'outbox.mark_published_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Outbox mark published operation failed',
        details: { eventId },
        cause: error,
      });
    }
  }

  async scheduleRetry(
    eventId: string,
    delayMs: number,
    lastFailureReason: string,
  ): Promise<void> {
    try {
      await this.db
        .update(outboxSchema.outboxMessages)
        .set({
          nextAttemptAt: sql`now() + make_interval(secs => ${delayMs}::float8 / 1000.0)`,
          lastFailureReason,
        })
        .where(
          and(
            eq(outboxSchema.outboxMessages.eventId, eventId),
            isNull(outboxSchema.outboxMessages.publishedAt),
          ),
        );
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'outbox.schedule_retry_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Outbox retry schedule operation failed',
        details: { eventId },
        cause: error,
      });
    }
  }

  async markDeadLettered(
    eventId: string,
    lastFailureReason: string,
  ): Promise<void> {
    try {
      await this.db
        .update(outboxSchema.outboxMessages)
        .set({ deadLetteredAt: sql`now()`, lastFailureReason })
        .where(
          and(
            eq(outboxSchema.outboxMessages.eventId, eventId),
            isNull(outboxSchema.outboxMessages.publishedAt),
            isNull(outboxSchema.outboxMessages.deadLetteredAt),
          ),
        );
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'outbox.mark_dead_lettered_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Outbox mark dead lettered operation failed',
        details: { eventId },
        cause: error,
      });
    }
  }
}

function byClaimOrder(
  left: outboxSchema.OutboxMessageRow,
  right: outboxSchema.OutboxMessageRow,
): number {
  const createdAtOrder = left.createdAt.getTime() - right.createdAt.getTime();
  return createdAtOrder !== 0
    ? createdAtOrder
    : left.eventId.localeCompare(right.eventId);
}
