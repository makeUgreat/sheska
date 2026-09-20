import { SheskaError } from '@core/errors';

function serializeCause(value: unknown, seen = new Set<Error>()): unknown {
  if (!(value instanceof Error)) return value;
  if (seen.has(value)) {
    return { name: value.name, message: value.message };
  }
  seen.add(value);

  return {
    name: value.name,
    message: value.message,
    ...(value.cause instanceof Error && {
      cause: serializeCause(value.cause, seen),
    }),
  };
}

function stackWithCauses(error: Error, seen = new Set<Error>()): string {
  const stack = error.stack ?? '';
  if (seen.has(error)) {
    return stack;
  }
  seen.add(error);

  return error.cause instanceof Error
    ? `${stack}\ncaused by: ${stackWithCauses(error.cause, seen)}`
    : stack;
}

export function toErrorLogContext(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { error: String(error) };
  }

  if (!(error instanceof SheskaError)) {
    return {
      errorName: error.name,
      error: error.message,
      failure: { stack: stackWithCauses(error) },
    };
  }

  return {
    errorName: error.name,
    error: error.message,
    kind: error.kind,
    code: error.code,
    details: error.details,
    failure: { stack: stackWithCauses(error) },
    ...(error.cause !== undefined && { cause: serializeCause(error.cause) }),
  };
}
