import { z } from 'zod';
import { cursorQueryParamSchema } from '@kernels/presentation';
import { type PostQuerySearchCursor } from '@contexts/posts/application/ports';

const rankedCursorSchema = z.object({
  id: z.string(),
  score: z.number('Invalid cursor'),
});

export const searchPostsHttpRequestSchema = z
  .object({
    q: z.string().trim().min(1),
    cursor: cursorQueryParamSchema.pipe(rankedCursorSchema).optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export class SearchPostsHttpRequest {
  static readonly zodSchema = searchPostsHttpRequestSchema;

  readonly q!: string;
  readonly cursor?: PostQuerySearchCursor;
  readonly limit!: number;
}
