import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { type PostSummaryPrompt } from '@contexts/library/application/use-cases/generate-post-summary.prompt';
import { type TextAnthropicGeneratorOptions } from '@contexts/library/infrastructure/text-generation/anthropic/text.anthropic.generator';

export interface GeneratePostSummaryExperimentSettings {
  readonly name: string;
  readonly prompt: PostSummaryPrompt;
  readonly generator: TextAnthropicGeneratorOptions;
  readonly instructionsFile: string;
}

const settingsEnvSchema = z.object({
  EVAL_POST_SUMMARY_NAME: z
    .string()
    .optional()
    .transform((name) => name || undefined),
  EVAL_POST_SUMMARY_MODEL: z.enum(['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5']),
  EVAL_POST_SUMMARY_EFFORT: z.enum(['low', 'medium', 'high']),
  EVAL_POST_SUMMARY_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive(),
  EVAL_POST_SUMMARY_INSTRUCTIONS_FILE: z.string().min(1),
});

export function readGeneratePostSummaryExperimentSettings(): GeneratePostSummaryExperimentSettings {
  const env = settingsEnvSchema.parse(process.env);
  const generator: TextAnthropicGeneratorOptions = { model: env.EVAL_POST_SUMMARY_MODEL, effort: env.EVAL_POST_SUMMARY_EFFORT };

  return {
    name: env.EVAL_POST_SUMMARY_NAME ?? `generate-post-summary ${generator.model} ${generator.effort}`,
    prompt: {
      instructions: readFileSync(env.EVAL_POST_SUMMARY_INSTRUCTIONS_FILE, 'utf8').trimEnd(),
      maxOutputTokens: env.EVAL_POST_SUMMARY_MAX_OUTPUT_TOKENS,
    },
    generator,
    instructionsFile: env.EVAL_POST_SUMMARY_INSTRUCTIONS_FILE,
  };
}
