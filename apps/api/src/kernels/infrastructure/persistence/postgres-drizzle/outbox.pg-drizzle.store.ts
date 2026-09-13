import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import {
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

  async findPending(limit: number): Promise<IntegrationEvent[]> {
    try {
      const rows = await this.db
        .select()
        .from(outboxSchema.outboxMessages)
        .where(isNull(outboxSchema.outboxMessages.publishedAt))
        .orderBy(asc(outboxSchema.outboxMessages.createdAt))
        .limit(limit);

      return rows.map((row) => ({
        eventId: row.eventId,
        eventType: row.eventType,
        eventVersion: row.eventVersion,
        occurredAt: row.occurredAt,
        payload: row.payload,
      }));
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'outbox.find_pending_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Outbox pending event lookup failed',
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
}
