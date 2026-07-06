import { type SourceSyncJob } from './source-sync-job.aggregate';

export interface SourceSyncJobRepository {
  find(criteria: { id: string }): Promise<SourceSyncJob | null>;
  save(syncJob: SourceSyncJob): Promise<SourceSyncJob>;
}
