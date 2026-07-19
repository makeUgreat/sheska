import { z } from 'zod';

export const searchPostsHttpRequestSchema = z
  .object({
    q: z.string().min(2),
  })
  .strict();

export class SearchPostsHttpRequest {
  static readonly zodSchema = searchPostsHttpRequestSchema;

  readonly q!: string;
}
