import { type OnModuleDestroy } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as sourcesSchema from '@contexts/sources/infrastructure/persistence/postgres-drizzle/schema';
import * as ingestionSchema from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/schema';

const schema = {
  ...sourcesSchema,
  ...ingestionSchema,
};

export type ApiDrizzleSchema = typeof schema;
export type ApiDrizzleDatabase = NodePgDatabase<ApiDrizzleSchema>;

export interface DrizzlePostgresProviderOptions {
  databaseUrl: string;
}

export class DrizzlePostgresProvider implements OnModuleDestroy {
  readonly database: ApiDrizzleDatabase;

  private readonly pool: Pool;

  constructor(options: DrizzlePostgresProviderOptions) {
    this.pool = new Pool({
      connectionString: options.databaseUrl,
    });
    this.database = drizzle({ client: this.pool, schema });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
