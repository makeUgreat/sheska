import { z } from 'zod';

export const publishPostHttpRequestSchema = z
  .object({
    sourceId: z.string().min(1),
    title: z
      .string()
      .transform((value) => value.trim())
      .pipe(z.string().min(1).max(200)),
  })
  .strict();

export class PublishPostHttpRequest {
  static readonly zodSchema = publishPostHttpRequestSchema;

  readonly sourceId!: string;
  readonly title!: string;
}

export interface PublishPostHttpResponse {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly viewCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
