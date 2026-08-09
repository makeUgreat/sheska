import { z } from 'zod';
import {
  type CursorValue,
  cursorQueryParamSchema,
} from '@kernels/presentation';

export const listSourcesHttpRequestSchema = z
  .object({
    cursor: cursorQueryParamSchema.optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export class ListSourcesHttpRequest {
  static readonly zodSchema = listSourcesHttpRequestSchema;

  readonly cursor?: CursorValue;
  readonly limit!: number;
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
