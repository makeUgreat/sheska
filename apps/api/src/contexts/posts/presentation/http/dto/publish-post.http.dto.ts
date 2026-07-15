import { z } from 'zod';

export const publishPostHttpRequestSchema = z
  .object({
    sourceId: z.string().min(1),
  })
  .strict();

export class PublishPostHttpRequest {
  static readonly zodSchema = publishPostHttpRequestSchema;

  readonly sourceId!: string;
}

export interface PublishPostHttpResponse {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly viewCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
