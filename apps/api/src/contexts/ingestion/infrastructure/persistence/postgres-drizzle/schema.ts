import {
  customType,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

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

export const sourceVectors = pgTable(
  'source_vectors',
  {
    sourceId: text('source_id').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    chunkContent: text('chunk_content').notNull(),
    embedding: vector('embedding', 1024).notNull(),
    model: text('model').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sourceId, t.chunkIndex] })],
);

export type SourceVectorRow = typeof sourceVectors.$inferSelect;
export type SourceVectorInsert = typeof sourceVectors.$inferInsert;
