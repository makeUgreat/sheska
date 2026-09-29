import { sql } from 'drizzle-orm';
import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { type SourceFrontmatterProps } from '@contexts/library/domain';

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

export const sourceLinks = pgTable(
  'source_links',
  {
    sourceId: text('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    target: text('target').notNull(),
    resolvedPath: text('resolved_path'),
  },
  (table) => [
    primaryKey({ columns: [table.sourceId, table.target] }),
    index('source_links_resolved_path_idx').on(table.resolvedPath),
  ],
);

export type SourceRow = typeof sources.$inferSelect;
export type SourceLinkRow = typeof sourceLinks.$inferSelect;
export type SourceLinkInsert = typeof sourceLinks.$inferInsert;
export type SourceInsert = typeof sources.$inferInsert;
export type SourceSyncJobRow = typeof sourceSyncJobs.$inferSelect;
export type SourceSyncJobInsert = typeof sourceSyncJobs.$inferInsert;

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
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
