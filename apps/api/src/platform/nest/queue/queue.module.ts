import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { BullMQOtel } from 'bullmq-otel';
import { SERVICE_NAME } from '@platform/otel/otel.bootstrap';
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
          // Applies to every queue/worker registered off this root config
          // (embed-requests, embed-results, health-check): BullMQ wraps
          // add()/process() in spans and carries the producer's trace
          // context into the job so the worker span links back to it.
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
