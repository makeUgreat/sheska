export interface SheskaError {
  readonly kind: string;
  readonly code: string;
  readonly [key: string]: unknown;
}

export function isSheskaError(error: unknown): error is Error & SheskaError {
  if (!(error instanceof Error)) {
    return false;
  }

  const candidate = error as Error & Partial<SheskaError>;

  return (
    typeof candidate.kind === 'string' && typeof candidate.code === 'string'
  );
}
