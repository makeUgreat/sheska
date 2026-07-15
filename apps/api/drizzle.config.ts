import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    './src/contexts/sources/infrastructure/persistence/postgres-drizzle/schema.ts',
    './src/contexts/ingestion/infrastructure/persistence/postgres-drizzle/schema.ts',
    './src/contexts/posts/infrastructure/persistence/postgres-drizzle/schema.ts',
  ],
  out: './database/drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
