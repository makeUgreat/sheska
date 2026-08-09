import { sql } from 'drizzle-orm';
import {
  customType,
  integer,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
});

export const sources = pgTable('sources', {
  id: text('id').primaryKey(),
  externalSourceId: text('external_source_id').notNull().unique(),
  content: text('content').notNull(),
  fingerprint: text('fingerprint').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  contentSearchVector: tsvector('content_search_vector')
    .notNull()
    .generatedAlwaysAs(sql`to_tsvector('simple', bigram_tokens(content))`),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sourceSyncJobs = pgTable('source_sync_jobs', {
  id: text('id').primaryKey(),
  sourceId: text('source_id')
    .notNull()
    .references(() => sources.id),
  fingerprint: text('fingerprint').notNull(),
  status: text('status').notNull(),
  totalChunks: integer('total_chunks'),
  processedChunks: integer('processed_chunks').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SourceRow = typeof sources.$inferSelect;
export type SourceInsert = typeof sources.$inferInsert;
export type SourceSyncJobRow = typeof sourceSyncJobs.$inferSelect;
export type SourceSyncJobInsert = typeof sourceSyncJobs.$inferInsert;
