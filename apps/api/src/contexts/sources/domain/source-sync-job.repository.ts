import { type SourceSyncJob } from './source-sync-job.aggregate';

export interface SourceSyncJobRepository {
  save(syncJob: SourceSyncJob): Promise<SourceSyncJob>;
}
