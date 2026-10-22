import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import type { ConfigType } from '@nestjs/config';
import { BullMQOtel } from 'bullmq-otel';
import { SERVICE_NAME } from '@platform/otel/otel.bootstrap';
import { queueConfig } from './queue.config';
import { QUEUE_HEALTH_QUEUE, QueueHealthProbe } from './queue-health.probe';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [queueConfig.KEY],
      useFactory: (config: ConfigType<typeof queueConfig>) => {
        return {
          connection: {
            url: config.redisUrl,
          },
          telemetry: new BullMQOtel(SERVICE_NAME),
        };
      },
    }),
    BullModule.registerQueue({ name: QUEUE_HEALTH_QUEUE }),
  ],
  providers: [QueueHealthProbe],
  exports: [BullModule, QueueHealthProbe],
})
export class QueueModule {}
