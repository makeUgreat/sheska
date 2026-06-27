import {
  ok as neverthrowOk,
  type Result as NeverthrowResult,
} from 'neverthrow';

export {
  Err,
  Ok,
  Result,
  ResultAsync,
  err,
  errAsync,
  fromAsyncThrowable,
  fromPromise,
  fromSafePromise,
  fromThrowable,
  ok,
  okAsync,
  safeTry,
} from 'neverthrow';

export function mapNullableToResult<TInput, TOutput, TError>(
  value: TInput | null,
  mapper: (value: TInput) => NeverthrowResult<TOutput, TError>,
): NeverthrowResult<TOutput | null, TError> {
  return value === null ? neverthrowOk(null) : mapper(value);
}
