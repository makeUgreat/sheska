import { z } from 'zod';

const anthropicEnvSchema = z.object({
  EVAL_ANTHROPIC_API_KEY: z.string().min(1),
});

export function readAnthropicApiKey(): string {
  return anthropicEnvSchema.parse(process.env).EVAL_ANTHROPIC_API_KEY;
}
