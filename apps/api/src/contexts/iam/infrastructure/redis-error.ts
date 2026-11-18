import { ReplyError } from 'ioredis';
import { SheskaError, UnavailableError, UnexpectedError } from '@core/errors';

export function toRedisError(error: unknown): SheskaError {
  if (error instanceof SheskaError) return error;
  if (error instanceof ReplyError) {
    return new UnexpectedError({
      code: 'redis.command_rejected',
      message: 'Redis rejected a command',
      details: {},
      cause: error,
    });
  }
  return new UnavailableError({
    code: 'redis.unavailable',
    message: 'Redis is unavailable',
    details: {},
    cause: error,
  });
}
