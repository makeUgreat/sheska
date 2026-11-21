import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { IamModule } from '@contexts/iam';
import { ownerPasswordSecretConfig } from '@contexts/iam/infrastructure/owner-password/secret/owner-password.secret.config';
import { LibraryModule } from '@contexts/library/library.module';
import { ollamaConfig } from '@contexts/ingestion/infrastructure/embedding/ollama-http/ollama-http.config';
import { IngestionModule } from '@contexts/ingestion/ingestion.module';
import { attachmentContentR2Config } from '@contexts/library/infrastructure/attachment-content/r2/attachment-content.r2.config';
import { databaseConfig } from './database/database.config';
import { DatabaseModule } from './database/database.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { HealthModule } from './health/health.module';
import { httpConfig } from './http/http.config';
import { DeclaredErrorCodesInterceptor } from './interceptors/declared-error-codes.interceptor';
import { loggerConfig } from './logger/logger.config';
import { LoggerModule } from './logger/logger.module';
import { OutboxModule } from './outbox/outbox.module';
import { QueueModule } from './queue/queue.module';
import { redisConfig } from './redis/redis.config';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      isGlobal: true,
      load: [databaseConfig, httpConfig, loggerConfig, redisConfig, ollamaConfig, attachmentContentR2Config, ownerPasswordSecretConfig],
    }),
    LoggerModule,
    EventEmitterModule.forRoot({ wildcard: false }),
    QueueModule,
    RedisModule,
    DatabaseModule,
    HealthModule,
    LibraryModule.forRoot(),
    IngestionModule.forRoot(),
    IamModule.forRoot(),
    OutboxModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: DeclaredErrorCodesInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
