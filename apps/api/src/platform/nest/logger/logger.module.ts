import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LOGGER } from '@kernels/application';
import { parseLoggerConfig } from './logger.config';
import { PinoLoggerAdapter } from './pino-logger.adapter';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      useFactory: () => {
        const { level } = parseLoggerConfig(process.env);
        return {
          pinoHttp: {
            level,
            autoLogging: {
              ignore: (req) => ['/livez', '/readyz'].includes(req.url ?? ''),
            },
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
