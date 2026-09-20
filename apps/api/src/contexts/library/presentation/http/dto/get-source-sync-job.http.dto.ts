export interface GetSourceSyncJobHttpResponse {
  readonly syncJobId: string;
  readonly sourceId: string;
  readonly fingerprint: string;
  readonly status: string;
  readonly totalChunks: number | null;
  readonly processedChunks: number | null;
  readonly createdAt: string;
}
