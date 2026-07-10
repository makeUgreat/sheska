import { z } from 'zod';

const ollamaConfigSchema = z
  .object({
    EMBEDDING_BASE_URL: z.url(),
  })
  .transform((env) => ({
    baseUrl: env.EMBEDDING_BASE_URL,
  }));

export type OllamaConfig = z.infer<typeof ollamaConfigSchema>;

export function parseOllamaConfig(env: Record<string, unknown>): OllamaConfig {
  return ollamaConfigSchema.parse(env);
}
