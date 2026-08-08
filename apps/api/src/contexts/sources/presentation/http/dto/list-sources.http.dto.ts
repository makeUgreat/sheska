import { z } from 'zod';
import { decodeCursor } from '@kernels/application';

export const listSourcesHttpRequestSchema = z
  .object({
    cursor: z
      .string()
      .refine(isValidCursor, { message: 'Invalid cursor' })
      .optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export class ListSourcesHttpRequest {
  static readonly zodSchema = listSourcesHttpRequestSchema;

  readonly cursor?: string;
  readonly limit!: number;
}

function isValidCursor(cursor: string): boolean {
  try {
    decodeCursor(cursor);
    return true;
  } catch {
    return false;
  }
}

export interface SyncJobSummaryHttpResponse {
  readonly syncJobId: string;
  readonly status: string;
  readonly totalChunks: number | null;
  readonly processedChunks: number;
  readonly createdAt: string;
}

export interface SourceSummaryHttpResponse {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly fingerprint: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly latestSyncJob: SyncJobSummaryHttpResponse | null;
  readonly publishedPostId: string | null;
}

export interface ListSourcesHttpResponse {
  readonly sources: SourceSummaryHttpResponse[];
  readonly nextCursor: string | null;
}
