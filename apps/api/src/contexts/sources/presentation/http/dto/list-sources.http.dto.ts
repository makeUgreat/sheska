import { z } from 'zod';

export const listSourcesHttpRequestSchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
  })
  .strict();

export class ListSourcesHttpRequest {
  static readonly zodSchema = listSourcesHttpRequestSchema;

  readonly page?: number;
  readonly limit?: number;
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
}
