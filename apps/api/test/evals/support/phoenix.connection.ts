import { execFileSync } from 'node:child_process';
import { createClient, type PhoenixClient } from '@arizeai/phoenix-client';
import { z } from 'zod';

const phoenixEnvSchema = z.object({
  EVAL_PHOENIX_URL: z.url({ protocol: /^https?$/ }),
  EVAL_PHOENIX_API_KEY: z.string().min(1),
});

export function createPhoenixClient(): PhoenixClient {
  const env = phoenixEnvSchema.parse(process.env);

  return createClient({
    options: { baseUrl: env.EVAL_PHOENIX_URL, headers: { Authorization: `Bearer ${env.EVAL_PHOENIX_API_KEY}` } },
  });
}

export function toExperimentMetadata(): { gitSha: string; gitDirty: boolean } {
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();

  return { gitSha: git('rev-parse', '--short', 'HEAD'), gitDirty: git('status', '--porcelain') !== '' };
}
