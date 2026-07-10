import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { type LoggerPort } from '@kernels/application';

@Injectable()
export class PinoLoggerAdapter implements LoggerPort {
  constructor(private readonly logger: PinoLogger) {}

  log(message: string, context?: Record<string, unknown>): void {
    this.logger.info(context ?? {}, message);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.logger.error(context ?? {}, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(context ?? {}, message);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(context ?? {}, message);
  }
}
