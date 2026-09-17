export type SyncJobSummaryStatus = 'waiting' | 'completed' | 'failed';
export type SyncJobStatus = SyncJobSummaryStatus | 'processing';

export interface SyncJobSummary {
  syncJobId: string;
  status: SyncJobSummaryStatus;
  totalChunks: number | null;
  createdAt: string;
}

export interface SyncJob {
  syncJobId: string;
  sourceId: string;
  fingerprint: string;
  status: SyncJobStatus;
  totalChunks: number | null;
  processedChunks: number | null;
  createdAt: string;
}

export interface SourceSummary {
  sourceId: string;
  externalSourceId: string;
  title: string;
  fingerprint: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  latestSyncJob: SyncJobSummary | null;
  publishedPostId: string | null;
}

export interface ListSourcesParams {
  page?: number;
  pageSize?: number;
  syncJobStatus?: SyncJobSummaryStatus;
}

export interface ListSourcesResponse {
  sources: SourceSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface EmbeddingInfo {
  model: string;
  dimensions: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetSourceResponse {
  sourceId: string;
  externalSourceId: string;
  frontmatter: Record<string, unknown>;
  title: string;
  body: string;
  fingerprint: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  latestSyncJob: SyncJobSummary | null;
  embedding: EmbeddingInfo | null;
  publishedPostId: string | null;
}
