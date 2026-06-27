import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as sourcesSchema from '@contexts/sources/infrastructure/persistence/postgres-drizzle/schema';
import { parseDatabaseConfig } from './database.config';

const schema = {
  ...sourcesSchema,
};

export type ApiDrizzleSchema = typeof schema;
export type ApiDrizzleDatabase = NodePgDatabase<ApiDrizzleSchema>;

@Injectable()
export class DrizzlePostgresProvider implements OnModuleDestroy {
  readonly database: ApiDrizzleDatabase;

  private readonly pool: Pool;

  constructor(configService: ConfigService) {
    const config = parseDatabaseConfig({
      DATABASE_URL: configService.get('DATABASE_URL'),
    });

    this.pool = new Pool({
      connectionString: config.databaseUrl,
    });
    this.database = drizzle({ client: this.pool, schema });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
