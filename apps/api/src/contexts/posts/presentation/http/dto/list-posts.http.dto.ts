import { z } from 'zod';
import { decodeCursor } from '@kernels/application';

export const listPostsHttpRequestSchema = z
  .object({
    cursor: z
      .string()
      .refine(isValidCursor, { message: 'Invalid cursor' })
      .optional(),
    limit: z.coerce.number().int().positive().optional(),
  })
  .strict();

export class ListPostsHttpRequest {
  static readonly zodSchema = listPostsHttpRequestSchema;

  readonly cursor?: string;
  readonly limit?: number;
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

function isValidCursor(cursor: string): boolean {
  try {
    decodeCursor(cursor);
    return true;
  } catch {
    return false;
  }
}
