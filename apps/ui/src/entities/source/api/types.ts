export interface SyncJobSummary {
  syncJobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalChunks: number | null;
  processedChunks: number;
  createdAt: string;
}

export interface SourceSummary {
  sourceId: string;
  externalSourceId: string;
  fingerprint: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  latestSyncJob: SyncJobSummary | null;
  publishedPostId: string | null;
}

export interface ListSourcesParams {
  cursor?: string;
  limit?: number;
}

export interface ListSourcesResponse {
  sources: SourceSummary[];
  nextCursor: string | null;
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
  content: string;
  fingerprint: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  latestSyncJob: SyncJobSummary | null;
  embedding: EmbeddingInfo | null;
  publishedPostId: string | null;
}
