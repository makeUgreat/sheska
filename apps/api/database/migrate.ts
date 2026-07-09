import { runMigrations } from './migrator';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  console.info(`[migrate] Running migrations...`);
  await runMigrations(databaseUrl);
  console.info('[migrate] Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
