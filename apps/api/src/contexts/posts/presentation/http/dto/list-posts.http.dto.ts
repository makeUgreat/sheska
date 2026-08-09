import { z } from 'zod';
import {
  type CursorValue,
  cursorQueryParamSchema,
} from '@kernels/presentation';

export const listPostsHttpRequestSchema = z
  .object({
    cursor: cursorQueryParamSchema.optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export class ListPostsHttpRequest {
  static readonly zodSchema = listPostsHttpRequestSchema;

  readonly cursor?: CursorValue;
  readonly limit!: number;
}

export interface ListPostsHttpResponseItem {
  postId: string;
  sourceId: string;
  title: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListPostsHttpResponse {
  posts: ListPostsHttpResponseItem[];
  nextCursor: string | null;
}
