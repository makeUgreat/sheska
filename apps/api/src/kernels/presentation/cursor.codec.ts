import { z } from 'zod';

const cursorValueSchema = z.object({
  id: z.string().min(1),
  score: z.number().optional(),
});

export type CursorValue = {
  readonly id: string;
  readonly score?: number;
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
    JSON.stringify({ id: cursor.id, score: cursor.score }),
  ).toString('base64url');
}

export function decodeCursor(encoded: string): CursorValue {
  const parsed: unknown = JSON.parse(
    Buffer.from(encoded, 'base64url').toString(),
  );

  const result = cursorValueSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('Invalid cursor');
  }

  return result.data;
}

export const cursorQueryParamSchema = z.string().transform((value, ctx) => {
  try {
    return decodeCursor(value);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid cursor' });
    return z.NEVER;
  }
});
