import { type NodePgDatabase } from 'drizzle-orm/node-postgres';

export type PgDrizzleSession<TSchema extends Record<string, unknown>> = Pick<
  NodePgDatabase<TSchema>,
  'delete' | 'execute' | 'insert' | 'select' | 'update'
>;
