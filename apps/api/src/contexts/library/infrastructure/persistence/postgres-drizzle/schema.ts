import { sql } from 'drizzle-orm';
import { bigint, customType, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { type SourceFrontmatterProps } from '@contexts/library/domain';

const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
});

export const sources = pgTable(
  'sources',
  {
    id: text('id').primaryKey(),
    externalSourceId: text('external_source_id').notNull().unique(),
    body: text('body').notNull(),
    frontmatter: jsonb('frontmatter').$type<SourceFrontmatterProps>().notNull().default({}),
    series: text('series'),
    seriesOrder: integer('series_order'),
    title: text('title').notNull(),
    fingerprint: text('fingerprint').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    titleSearchVector: tsvector('title_search_vector')
      .notNull()
      .generatedAlwaysAs(sql`to_tsvector('simple', bigram_tokens(title))`),
    bodySearchVector: tsvector('body_search_vector')
      .notNull()
      .generatedAlwaysAs(sql`to_tsvector('simple', bigram_tokens(body))`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('sources_title_search_vector_idx').using('gin', table.titleSearchVector),
    index('sources_body_search_vector_idx').using('gin', table.bodySearchVector),
  ],
);

export const sourceSyncJobs = pgTable(
  'source_sync_jobs',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    fingerprint: text('fingerprint').notNull(),
    status: text('status').notNull(),
    totalChunks: integer('total_chunks'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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

export const posts = pgTable('posts', {
  id: text('id')
    .primaryKey()
    .references(() => sources.id, { onDelete: 'cascade' }),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const postViews = pgTable(
  'post_views',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    ip: text('ip').notNull(),
    client: text('client').notNull(),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('post_views_post_id_ip_viewed_at_idx').on(table.postId, table.ip, table.viewedAt.desc()),
    index('post_views_post_id_viewed_at_id_idx').on(table.postId, table.viewedAt.desc(), table.id.desc()),
  ],
);

export const postSummaries = pgTable('post_summaries', {
  postId: text('post_id')
    .primaryKey()
    .references(() => posts.id, { onDelete: 'cascade' }),
  fingerprint: text('fingerprint').notNull(),
  sentences: text('sentences').array(),
  model: text('model'),
  finishedAt: timestamp('finished_at', { withTimezone: true }).notNull(),
});

export type PostViewRow = typeof postViews.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type PostInsert = typeof posts.$inferInsert;
export type PostSummaryRow = typeof postSummaries.$inferSelect;
export type PostSummaryInsert = typeof postSummaries.$inferInsert;
