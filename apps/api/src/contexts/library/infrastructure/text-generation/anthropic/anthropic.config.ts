import { type ConfigType, registerAs } from '@nestjs/config';
import { z } from 'zod';
import { withFileSecrets } from '@kernels/infrastructure';

const anthropicEnvSchema = z.object({
  /** 비밀값. `_FILE`로도 받는다. */
  ANTHROPIC_API_KEY: z.string().min(1),
});

export const anthropicConfig = registerAs('anthropic', () => {
  const result = anthropicEnvSchema.safeParse(withFileSecrets(process.env, ['ANTHROPIC_API_KEY']));
  if (!result.success) {
    throw new Error(`Invalid Anthropic configuration.\n${z.prettifyError(result.error)}`);
  }

  return { apiKey: result.data.ANTHROPIC_API_KEY };
});

export type AnthropicConfig = ConfigType<typeof anthropicConfig>;
