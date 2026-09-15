export type SyncJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SyncJobSummary {
  syncJobId: string;
  status: SyncJobStatus;
  totalChunks: number | null;
  processedChunks: number;
  createdAt: string;
}

export interface SyncJob extends SyncJobSummary {
  sourceId: string;
  fingerprint: string;
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
  syncJobStatus?: SyncJobStatus;
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
