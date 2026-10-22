import { trace } from '@opentelemetry/api';
import { Global, Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LOGGER } from '@kernels/application';
import { loggerConfig } from './logger.config';
import { PinoLoggerAdapter } from './pino-logger.adapter';
import { serializeRequest } from './request.serializer';
import { serializeAccessLogError } from './access-log-error.serializer';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [loggerConfig.KEY],
      useFactory: ({ level, format }: ConfigType<typeof loggerConfig>) => {
        return {
          pinoHttp: {
            level,
            timestamp: () => `,"time":"${new Date().toISOString()}"`,
            mixin: () => {
              const spanContext = trace.getActiveSpan()?.spanContext();
              if (!spanContext || !trace.isSpanContextValid(spanContext)) {
                return {};
              }
              return {
                trace_id: spanContext.traceId,
                span_id: spanContext.spanId,
              };
            },
            autoLogging: {
              ignore: (req) => ['/livez', '/readyz'].includes(req.url ?? ''),
            },
            serializers: {
              req: serializeRequest,
              err: serializeAccessLogError,
            },
            transport:
              format === 'pretty'
                ? {
                    target: 'pino-pretty',
                    options: {
                      singleLine: true,
                      colorize: true,
                      ignore: 'pid,hostname',
                      errorLikeObjectKeys: ['err', 'error', 'failure'],
                    },
                  }
                : undefined,
          },
        };
      },
    }),
  ],
  providers: [
    PinoLoggerAdapter,
    {
      provide: LOGGER,
      useExisting: PinoLoggerAdapter,
    },
  ],
  exports: [LOGGER],
})
export class LoggerModule {}
