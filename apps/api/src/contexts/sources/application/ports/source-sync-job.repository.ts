import { type ResultAsync } from '@core/result';
import {
  APPLICATION_FAILURE_KIND,
  type ApplicationFailureOf,
} from '@kernels/application';
import { type SourceSyncJob } from '@contexts/sources/domain';

export type SourceSyncJobRepositoryUnavailableDetails = {
  readonly causeCode: string;
};

export type SourceSyncJobRepositoryUnavailableFailure = ApplicationFailureOf<
  typeof APPLICATION_FAILURE_KIND.DEPENDENCY_UNAVAILABLE,
  'source_sync_job_repository',
  'unavailable',
  SourceSyncJobRepositoryUnavailableDetails
>;

export type SourceSyncJobRepositoryStateConflictFailure = ApplicationFailureOf<
  typeof APPLICATION_FAILURE_KIND.STATE_CONFLICT,
  'source_sync_job_repository',
  'state_conflict'
>;

export type SourceSyncJobRepositoryApplicationFailure =
  | SourceSyncJobRepositoryUnavailableFailure
  | SourceSyncJobRepositoryStateConflictFailure;

export type SourceSyncJobRepositoryFailure =
  SourceSyncJobRepositoryApplicationFailure;

export interface SourceSyncJobRepository {
  save(
    syncJob: SourceSyncJob,
  ): ResultAsync<SourceSyncJob, SourceSyncJobRepositoryFailure>;
}
