export type CursorValue = {
  readonly createdAt: Date;
  readonly id: string;
};

export type CursorListOptions = {
  readonly limit: number;
  readonly cursor?: CursorValue;
};

export type CursorListResult<T> = {
  readonly items: T[];
  readonly nextCursor: CursorValue | null;
};

export function encodeCursor(cursor: CursorValue): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
    }),
  ).toString('base64url');
}

export function decodeCursor(encoded: string): CursorValue {
  const parsed = JSON.parse(
    Buffer.from(encoded, 'base64url').toString(),
  ) as unknown;

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('createdAt' in parsed) ||
    !('id' in parsed) ||
    typeof parsed.createdAt !== 'string' ||
    typeof parsed.id !== 'string' ||
    parsed.id.length === 0
  ) {
    throw new Error('Invalid cursor');
  }

  const createdAt = new Date(parsed.createdAt);

  if (Number.isNaN(createdAt.getTime())) {
    throw new Error('Invalid cursor');
  }

  return { createdAt, id: parsed.id };
}
