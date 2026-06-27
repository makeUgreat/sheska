import { type ResultAsync } from '@core/result';
import {
  APPLICATION_ERROR_KIND,
  type ApplicationErrorOf,
} from '@kernels/application';
import {
  type SourceSyncJob,
  type SourceSyncJobDomainError,
} from '@contexts/sources/domain';

export type SourceSyncJobRepositoryUnavailableDetails = {
  readonly causeCode: string;
};

export type SourceSyncJobRepositoryUnavailableError = ApplicationErrorOf<
  typeof APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
  'source_sync_job_repository',
  'unavailable',
  SourceSyncJobRepositoryUnavailableDetails
>;

export type SourceSyncJobRepositoryStateConflictError = ApplicationErrorOf<
  typeof APPLICATION_ERROR_KIND.STATE_CONFLICT,
  'source_sync_job_repository',
  'state_conflict'
>;

export type SourceSyncJobRepositoryApplicationError =
  | SourceSyncJobRepositoryUnavailableError
  | SourceSyncJobRepositoryStateConflictError;

export type SourceSyncJobRepositoryError =
  | SourceSyncJobRepositoryApplicationError
  | SourceSyncJobDomainError;

export interface SourceSyncJobRepository {
  save(
    syncJob: SourceSyncJob,
  ): ResultAsync<SourceSyncJob, SourceSyncJobRepositoryError>;
}
