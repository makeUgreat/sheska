import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().unique(),
  title: text('title').notNull(),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PostRow = typeof posts.$inferSelect;
export type PostInsert = typeof posts.$inferInsert;
