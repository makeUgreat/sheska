export interface BaseError {
  readonly kind: string;
  readonly code: string;
  readonly [key: string]: unknown;
}

export function isBaseError(e: unknown): e is Error & BaseError {
  return (
    e instanceof Error &&
    'kind' in e &&
    typeof (e as Record<string, unknown>)['kind'] === 'string' &&
    'code' in e &&
    typeof (e as Record<string, unknown>)['code'] === 'string'
  );
}
