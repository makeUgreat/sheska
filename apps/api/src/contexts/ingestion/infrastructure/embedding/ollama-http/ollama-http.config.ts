import { z } from 'zod';

export const OLLAMA_CONFIG = Symbol('OLLAMA_CONFIG');

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
