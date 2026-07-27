import type { SerializedError } from 'pino-std-serializers';

export function serializeAccessLogError(err: SerializedError) {
  const code =
    'code' in err && typeof err.code === 'string' ? err.code : undefined;

  return {
    type: err.type,
    message: err.message,
    ...(code !== undefined && { code }),
  };
}
