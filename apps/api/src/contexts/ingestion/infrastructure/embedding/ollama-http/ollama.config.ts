import { z } from 'zod';

const ollamaConfigSchema = z
  .object({
    OLLAMA_BASE_URL: z.url(),
    OLLAMA_MODEL: z.string().min(1),
  })
  .transform((env) => ({
    baseUrl: env.OLLAMA_BASE_URL,
    model: env.OLLAMA_MODEL,
  }));

export type OllamaConfig = z.infer<typeof ollamaConfigSchema>;

export function parseOllamaConfig(env: Record<string, unknown>): OllamaConfig {
  return ollamaConfigSchema.parse(env);
}
