import { type ResultAsync } from '@core/result';
import {
  APPLICATION_ERROR_KIND,
  type ApplicationErrorOf,
} from '@kernels/application';
import { type SourceSyncJob } from '@contexts/sources/domain';

export type SourceSyncJobRepositoryUnavailableError = ApplicationErrorOf<
  typeof APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
  'source_sync_job_repository',
  'unavailable'
>;

export type SourceSyncJobRepositoryStateConflictError = ApplicationErrorOf<
  typeof APPLICATION_ERROR_KIND.STATE_CONFLICT,
  'source_sync_job_repository',
  'state_conflict'
>;

export type SourceSyncJobRepositoryError =
  | SourceSyncJobRepositoryUnavailableError
  | SourceSyncJobRepositoryStateConflictError;

export interface SourceSyncJobRepository {
  save(
    syncJob: SourceSyncJob,
  ): ResultAsync<SourceSyncJob, SourceSyncJobRepositoryError>;
}
