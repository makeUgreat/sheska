import { databaseConfig } from '../src/platform/nest/database/database.config';
import { runMigrations } from './migrator';

async function main(): Promise<void> {
  const { databaseUrl } = databaseConfig();

  console.info(`[migrate] Running migrations...`);
  await runMigrations(databaseUrl);
  console.info('[migrate] Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
