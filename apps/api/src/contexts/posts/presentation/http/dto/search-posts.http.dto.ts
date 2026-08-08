import { z } from 'zod';
import { decodeCursor } from '@kernels/application';

export const searchPostsHttpRequestSchema = z
  .object({
    q: z.string().trim().min(1),
    cursor: z
      .string()
      .refine(isValidCursor, { message: 'Invalid cursor' })
      .optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export class SearchPostsHttpRequest {
  static readonly zodSchema = searchPostsHttpRequestSchema;

  readonly q!: string;
  readonly cursor?: string;
  readonly limit!: number;
}

function isValidCursor(cursor: string): boolean {
  try {
    return decodeCursor(cursor).score !== undefined;
  } catch {
    return false;
  }
}
