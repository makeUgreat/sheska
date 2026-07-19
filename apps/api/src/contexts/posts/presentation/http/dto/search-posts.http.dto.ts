import { z } from 'zod';
import { decodeCursor } from '@kernels/application';

export const searchPostsHttpRequestSchema = z
  .object({
    q: z.string().min(2),
    cursor: z
      .string()
      .refine(isValidCursor, { message: 'Invalid cursor' })
      .optional(),
    limit: z.coerce.number().int().positive().optional(),
  })
  .strict();

export class SearchPostsHttpRequest {
  static readonly zodSchema = searchPostsHttpRequestSchema;

  readonly q!: string;
  readonly cursor?: string;
  readonly limit?: number;
}

function isValidCursor(cursor: string): boolean {
  try {
    decodeCursor(cursor);
    return true;
  } catch {
    return false;
  }
}
