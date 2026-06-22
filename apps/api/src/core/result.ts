export type Result<T, E> = Ok<T, E> | Err<T, E>;

type ResultCollection = Record<string, Result<unknown, unknown>>;

type ResultValues<TResults extends ResultCollection> = {
  [Key in keyof TResults]: TResults[Key] extends Result<infer TValue, unknown>
    ? TValue
    : never;
};

type ResultErrors<TResults extends ResultCollection> =
  TResults[keyof TResults] extends Result<unknown, infer TError>
    ? TError
    : never;

export class Ok<T, E = never> {
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  isOk(): this is Ok<T, E> {
    return true;
  }

  isErr(): this is Err<T, E> {
    return false;
  }

  map<U>(mapper: (value: T) => U): Result<U, E> {
    return new Ok<U, E>(mapper(this.value));
  }

  andThen<U, F>(mapper: (value: T) => Result<U, F>): Result<U, E | F> {
    return mapper(this.value);
  }
}

export class Err<T = never, E = unknown> {
  readonly error: E;

  constructor(error: E) {
    this.error = error;
  }

  isOk(): this is Ok<T, E> {
    return false;
  }

  isErr(): this is Err<T, E> {
    return true;
  }

  map<U>(_mapper: (value: T) => U): Result<U, E> {
    return new Err<U, E>(this.error);
  }

  andThen<U, F>(_mapper: (value: T) => Result<U, F>): Result<U, E | F> {
    return new Err<U, E | F>(this.error);
  }
}

export function ok<T>(value: T): Result<T, never> {
  return new Ok<T, never>(value);
}

export function err<E>(error: E): Result<never, E> {
  return new Err<never, E>(error);
}

export function all<TResults extends ResultCollection>(
  results: TResults,
): Result<ResultValues<TResults>, ResultErrors<TResults>> {
  const values = {} as ResultValues<TResults>;

  for (const key of Object.keys(results) as Array<keyof TResults>) {
    const result = results[key];

    if (result.isErr()) {
      return err(result.error as ResultErrors<TResults>);
    }

    values[key] = result.value as ResultValues<TResults>[typeof key];
  }

  return ok(values);
}
