import { isBaseError } from '@core/base-error';

function serializeCause(value: unknown): unknown {
  if (!(value instanceof Error)) return value;
  return {
    name: value.name,
    message: value.message,
    ...(value.cause instanceof Error && { cause: serializeCause(value.cause) }),
  };
}

export function toErrorLogContext(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { error: String(error) };
  }

  if (isBaseError(error)) {
    const {
      error: _error,
      name: _name,
      stack: _stack,
      cause: _cause,
      message,
      ...rest
    } = error as Record<string, unknown>;
    return {
      errorName: error.name,
      error: message,
      ...rest,
      ...(error.cause !== undefined && { cause: serializeCause(error.cause) }),
    };
  }

  return { errorName: error.name, error: error.message };
}
