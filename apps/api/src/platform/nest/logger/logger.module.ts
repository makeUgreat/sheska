import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LOGGER } from '@kernels/application';
import { parseLoggerConfig } from './logger.config';
import { PinoLoggerAdapter } from './pino-logger.adapter';
import { serializeRequest } from './request.serializer';
import { serializeAccessLogError } from './access-log-error.serializer';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      useFactory: () => {
        const { level } = parseLoggerConfig(process.env);
        const isDevelopment = process.env.NODE_ENV === 'development';
        return {
          pinoHttp: {
            level,
            timestamp: () => `,"time":"${new Date().toISOString()}"`,
            autoLogging: {
              ignore: (req) => ['/livez', '/readyz'].includes(req.url ?? ''),
            },
            serializers: {
              req: serializeRequest,
              err: serializeAccessLogError,
            },
            transport: isDevelopment
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
