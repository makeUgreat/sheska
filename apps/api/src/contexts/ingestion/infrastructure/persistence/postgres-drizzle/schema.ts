import { customType, index, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { sources } from '@contexts/library/infrastructure/persistence/postgres-drizzle/schema';

const vector = (name: string, dimensions: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dimensions})`;
    },
    toDriver(value: number[]): string {
      return `[${value.join(',')}]`;
    },
    fromDriver(value: string): number[] {
      return value.slice(1, -1).split(',').map(Number);
    },
  })(name);

export const sourceEmbeddings = pgTable(
  'source_embeddings',
  {
    sourceId: text('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    chunkContent: text('chunk_content').notNull(),
    embedding: vector('embedding', 1024).notNull(),
    model: text('model').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.sourceId, t.chunkIndex] }),
    index('source_embeddings_embedding_hnsw_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
  ],
);

export type SourceEmbeddingRow = typeof sourceEmbeddings.$inferSelect;
export type SourceEmbeddingInsert = typeof sourceEmbeddings.$inferInsert;
