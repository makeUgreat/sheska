import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const apiTokens = pgTable(
  'api_tokens',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    secretHash: text('secret_hash').notNull(),
    hint: text('hint').notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('api_tokens_name_unique').on(table.name),
    uniqueIndex('api_tokens_secret_hash_unique').on(table.secretHash),
  ],
);

export type ApiTokenRow = typeof apiTokens.$inferSelect;
export type ApiTokenInsert = typeof apiTokens.$inferInsert;
