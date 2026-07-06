import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { parseQueueConfig } from './queue.config';
import { QUEUE_HEALTH_QUEUE, QueueHealthProbe } from './queue-health.probe';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = parseQueueConfig({
          REDIS_URL: configService.get('REDIS_URL'),
        });

        return {
          connection: {
            url: config.redisUrl,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: QUEUE_HEALTH_QUEUE }),
  ],
  providers: [QueueHealthProbe],
  exports: [BullModule, QueueHealthProbe],
})
export class QueueModule {}
