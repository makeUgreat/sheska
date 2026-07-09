import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SourcesModule } from '@contexts/sources/sources.module';
import { IngestionModule } from '@contexts/ingestion/ingestion.module';
import { DatabaseModule } from './database/database.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { HealthModule } from './health/health.module';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({ wildcard: false }),
    QueueModule,
    DatabaseModule,
    HealthModule,
    SourcesModule.forRoot(),
    ...(process.env.INGESTION_ENABLED === 'true'
      ? [IngestionModule.forRoot()]
      : []),
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
