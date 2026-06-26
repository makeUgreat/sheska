import { z } from 'zod';

const databaseConfigSchema = z
  .object({
    DATABASE_URL: z.url(),
  })
  .transform((env) => ({
    databaseUrl: env.DATABASE_URL,
  }));

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

export function parseDatabaseConfig(
  env: Record<string, unknown>,
): DatabaseConfig {
  return databaseConfigSchema.parse(env);
}
