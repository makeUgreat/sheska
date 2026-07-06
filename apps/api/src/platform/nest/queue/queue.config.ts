import { z } from 'zod';

const queueConfigSchema = z
  .object({
    REDIS_URL: z.url(),
  })
  .transform((env) => ({
    redisUrl: env.REDIS_URL,
  }));

export type QueueConfig = z.infer<typeof queueConfigSchema>;

export function parseQueueConfig(env: Record<string, unknown>): QueueConfig {
  return queueConfigSchema.parse(env);
}
