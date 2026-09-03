import { z } from 'zod';

const teiConfigSchema = z
  .object({
    EMBEDDING_BASE_URL: z.url(),
  })
  .transform((env) => ({
    baseUrl: env.EMBEDDING_BASE_URL,
  }));

export type TeiConfig = z.infer<typeof teiConfigSchema>;

export function parseTeiConfig(env: Record<string, unknown>): TeiConfig {
  return teiConfigSchema.parse(env);
}
