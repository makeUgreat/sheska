import {
  type ApiQuery,
  type ApiResponse,
  type SourceApi,
  type SourceEmbeddingResponse,
  type SourceResponse,
  type SourceSummaryResponse,
  type SourceSyncJobResponse,
  type SourceSyncJobStatus,
  type SourceSyncJobStoredStatus,
  type SourceSyncJobSummaryResponse,
} from '@sheska/contract';

export type SyncJobSummaryStatus = SourceSyncJobStoredStatus;
export type SyncJobStatus = SourceSyncJobStatus;
export type SyncJobSummary = SourceSyncJobSummaryResponse;
export type SyncJob = SourceSyncJobResponse;
export type SourceSummary = SourceSummaryResponse;
export type ListSourcesParams = ApiQuery<typeof SourceApi.list>;
export type ListSourcesResponse = ApiResponse<typeof SourceApi.list>;
export type EmbeddingInfo = SourceEmbeddingResponse;
export type GetSourceResponse = SourceResponse;
