import { isBaseError } from '@core/base-error';

export function toErrorLogContext(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { error: String(error) };
  }

  if (isBaseError(error)) {
    const {
      error: _error,
      name: _name,
      stack: _stack,
      message,
      ...rest
    } = error as Record<string, unknown>;
    return {
      errorName: error.name,
      error: message,
      ...rest,
    };
  }

  return { errorName: error.name, error: error.message };
}
