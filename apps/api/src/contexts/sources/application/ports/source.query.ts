export type SourceQueryCursor = {
  readonly createdAt: Date;
  readonly id: string;
};

export type SourceQueryPaginateOptions = {
  readonly limit?: number;
  readonly cursor?: SourceQueryCursor;
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
  readonly fingerprint: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly latestSyncJob: SourceQuerySyncJobSummary | null;
};

export type SourceQueryPaginateResult = {
  readonly sources: ReadonlyArray<SourceQueryListItem>;
  readonly nextCursor: SourceQueryCursor | null;
};

export interface SourceQuery {
  paginate(
    options?: SourceQueryPaginateOptions,
  ): Promise<SourceQueryPaginateResult>;
}
