import { Pool } from 'pg';
import { runMigrations } from './migrator';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.info('[reset] Dropping public schema...');
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    console.info('[reset] Schema dropped.');
  } finally {
    await pool.end();
  }

  console.info('[reset] Running migrations...');
  await runMigrations(databaseUrl);
  console.info('[reset] Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
