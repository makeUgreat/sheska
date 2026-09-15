import { z } from 'zod';

export const listSourcesSyncJobStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const listSourcesHttpRequestSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    syncJobStatus: listSourcesSyncJobStatusSchema.optional(),
  })
  .strict();

export class ListSourcesHttpRequest {
  static readonly zodSchema = listSourcesHttpRequestSchema;

  readonly page!: number;
  readonly pageSize!: number;
  readonly syncJobStatus?: 'pending' | 'processing' | 'completed' | 'failed';
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
  readonly title: string;
  readonly fingerprint: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly latestSyncJob: SyncJobSummaryHttpResponse | null;
  readonly publishedPostId: string | null;
}

export interface ListSourcesHttpResponse {
  readonly sources: SourceSummaryHttpResponse[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
}
