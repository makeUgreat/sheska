import { z } from 'zod';

export const updatePostHttpRequestSchema = z
  .object({
    title: z.string().min(1).max(200),
  })
  .strict();

export class UpdatePostHttpRequest {
  static readonly zodSchema = updatePostHttpRequestSchema;

  readonly title!: string;
}

export interface UpdatePostHttpResponse {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly viewCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
