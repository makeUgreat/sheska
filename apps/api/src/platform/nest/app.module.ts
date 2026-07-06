import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SourcesModule } from '@contexts/sources/sources.module';
import { DatabaseModule } from './database/database.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { HealthModule } from './health/health.module';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({ wildcard: false }),
    DatabaseModule,
    HealthModule,
    SourcesModule.forRoot(),
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
