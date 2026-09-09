import { type SourceSyncJob } from './source-sync-job.aggregate';

export interface SourceSyncJobRepository {
  get(criteria: { id: string }): Promise<SourceSyncJob>;
  find(criteria: { id: string }): Promise<SourceSyncJob | null>;
  findLatest(criteria: { sourceId: string }): Promise<SourceSyncJob | null>;
  save(syncJob: SourceSyncJob): Promise<SourceSyncJob>;
}
