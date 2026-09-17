import { sql } from 'drizzle-orm';
import {
  customType,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { type SourceFrontmatterProps } from '@contexts/sources/domain';

const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
});

export const sources = pgTable('sources', {
  id: text('id').primaryKey(),
  externalSourceId: text('external_source_id').notNull().unique(),
  body: text('body').notNull(),
  frontmatter: jsonb('frontmatter')
    .$type<SourceFrontmatterProps>()
    .notNull()
    .default({}),
  title: text('title').notNull(),
  fingerprint: text('fingerprint').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  titleSearchVector: tsvector('title_search_vector')
    .notNull()
    .generatedAlwaysAs(sql`to_tsvector('simple', bigram_tokens(title))`),
  bodySearchVector: tsvector('body_search_vector')
    .notNull()
    .generatedAlwaysAs(sql`to_tsvector('simple', bigram_tokens(body))`),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sourceSyncJobs = pgTable(
  'source_sync_jobs',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => sources.id),
    fingerprint: text('fingerprint').notNull(),
    status: text('status').notNull(),
    totalChunks: integer('total_chunks'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('source_sync_jobs_active_source_fingerprint_unique')
      .on(table.sourceId, table.fingerprint)
      .where(sql`${table.status} = 'waiting'`),
  ],
);

export type SourceRow = typeof sources.$inferSelect;
export type SourceInsert = typeof sources.$inferInsert;
export type SourceSyncJobRow = typeof sourceSyncJobs.$inferSelect;
export type SourceSyncJobInsert = typeof sourceSyncJobs.$inferInsert;
