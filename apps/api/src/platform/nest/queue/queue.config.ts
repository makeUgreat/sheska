import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const queueEnvSchema = z.object({
  /** BullMQ 큐가 쓰는 Redis 접속 주소다. 예: `redis://sheska-redis:6379` */
  REDIS_URL: z.url(),
});

export const queueConfig = registerAs('queue', () => {
  const result = queueEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Invalid queue configuration.\n${z.prettifyError(result.error)}`,
    );
  }
  return { redisUrl: result.data.REDIS_URL };
});
