import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/contexts/sources/infrastructure/persistence/postgres-drizzle/schema';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const _db = drizzle({ client: pool, schema });

    console.info('[seed] Seeding development data...');
    // TODO: insert seed rows using onConflictDoNothing for idempotency
    // Example:
    // await db.insert(schema.sources).values([...]).onConflictDoNothing();
    console.info('[seed] Done.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
