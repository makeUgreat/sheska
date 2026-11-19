import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const redisEnvSchema = z.object({
  /** 큐와 세션이 쓰는 Redis 접속 주소다. 예: `redis://sheska-redis:6379` */
  REDIS_URL: z.url(),
});

export const redisConfig = registerAs('redis', () => {
  const result = redisEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid Redis configuration.\n${z.prettifyError(result.error)}`);
  }

  return { redisUrl: result.data.REDIS_URL };
});
