import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { toErrorLogContext, type LoggerPort } from '@kernels/application';

@Injectable()
export class PinoLoggerAdapter implements LoggerPort {
  constructor(private readonly logger: PinoLogger) {}

  log(message: string, context?: Record<string, unknown>): void {
    this.logger.info(context ?? {}, message);
  }

  error(message: string, context?: Record<string, unknown>): void;
  error(
    message: string,
    error: unknown,
    context?: Record<string, unknown>,
  ): void;
  error(
    message: string,
    errorOrContext?: unknown,
    context?: Record<string, unknown>,
  ): void {
    if (arguments.length >= 3 || !isLogContext(errorOrContext)) {
      this.logger.error(
        { ...context, ...toErrorLogContext(errorOrContext) },
        message,
      );
      return;
    }

    this.logger.error(errorOrContext ?? {}, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(context ?? {}, message);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(context ?? {}, message);
  }
}

function isLogContext(value: unknown): value is Record<string, unknown> {
  return (
    value === undefined ||
    (typeof value === 'object' && value !== null && !(value instanceof Error))
  );
}
