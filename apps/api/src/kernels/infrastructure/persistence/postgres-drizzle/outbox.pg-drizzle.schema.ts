import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const outboxMessages = pgTable(
  'outbox_messages',
  {
    eventId: text('event_id').primaryKey(),
    eventType: text('event_type').notNull(),
    eventVersion: integer('event_version').notNull(),
    payload: jsonb('payload').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    attemptCount: integer('attempt_count').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deadLetteredAt: timestamp('dead_lettered_at', { withTimezone: true }),
    lastFailureReason: text('last_failure_reason'),
  },
  (table) => [
    index('outbox_messages_due_idx')
      .on(table.nextAttemptAt, table.createdAt)
      .where(
        sql`${table.publishedAt} IS NULL AND ${table.deadLetteredAt} IS NULL`,
      ),
  ],
);

export type OutboxMessageRow = typeof outboxMessages.$inferSelect;
export type OutboxMessageInsert = typeof outboxMessages.$inferInsert;
