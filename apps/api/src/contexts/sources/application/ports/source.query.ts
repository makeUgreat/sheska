export type SourceQueryPaginateOptions = {
  readonly page: number;
  readonly pageSize: number;
  readonly syncJobStatus?: 'pending' | 'processing' | 'completed' | 'failed';
};

export type SourceQuerySyncJobSummary = {
  readonly syncJobId: string;
  readonly status: string;
  readonly totalChunks: number | null;
  readonly processedChunks: number;
  readonly createdAt: Date;
};

export type SourceQueryListItem = {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly title: string;
  readonly fingerprint: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly latestSyncJob: SourceQuerySyncJobSummary | null;
  readonly publishedPostId: string | null;
};

export type SourceQueryPaginateResult = {
  readonly sources: ReadonlyArray<SourceQueryListItem>;
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
};

export interface SourceQuery {
  paginate(
    options: SourceQueryPaginateOptions,
  ): Promise<SourceQueryPaginateResult>;
  find(criteria: { sourceId: string }): Promise<string | null>;
}
