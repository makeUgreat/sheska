export interface SyncJobHttpResponse {
  readonly syncJobId: string;
  readonly status: string;
  readonly totalChunks: number | null;
  readonly createdAt: string;
}

export interface EmbeddingHttpResponse {
  readonly model: string;
  readonly dimensions: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface GetSourceHttpResponse {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly frontmatter: Readonly<Record<string, unknown>>;
  readonly title: string;
  readonly body: string;
  readonly fingerprint: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly latestSyncJob: SyncJobHttpResponse | null;
  readonly embedding: EmbeddingHttpResponse | null;
  readonly publishedPostId: string | null;
}
