import { type OutboxEvent, type OutboxWriter } from '@kernels/application';
import {
  classifyPostgresError,
  InfrastructureException,
  outboxMessages,
  type PgDrizzleSession,
} from '@kernels/infrastructure';

type OutboxSchema = { outboxMessages: typeof outboxMessages };

const ADAPTER = 'outbox.pg-drizzle';

export class OutboxPgDrizzleWriter implements OutboxWriter {
  constructor(private readonly db: PgDrizzleSession<OutboxSchema>) {}

  async append(event: OutboxEvent): Promise<void> {
    try {
      await this.db.insert(outboxMessages).values({
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
}
