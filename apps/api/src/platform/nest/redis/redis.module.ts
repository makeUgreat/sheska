import { Global, Module, type OnModuleDestroy, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Redis } from 'ioredis';
import { LOGGER, type LoggerPort } from '@kernels/application';
import { REDIS_TOKENS } from '@kernels/infrastructure';
import { redisConfig } from './redis.config';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_TOKENS.client,
      useFactory: (
        config: ConfigType<typeof redisConfig>,
        logger: LoggerPort,
      ): Redis => {
        const client = new Redis(config.redisUrl, {
          maxRetriesPerRequest: 0,
        });
        client.on('error', (error: unknown) => {
          logger.warn('Redis client error', error);
        });
        return client;
      },
      inject: [redisConfig.KEY, LOGGER],
    },
  ],
  exports: [REDIS_TOKENS.client],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_TOKENS.client) private readonly client: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
