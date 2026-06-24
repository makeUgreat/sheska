import {
  APPLICATION_ERROR_KIND,
  type ApplicationErrorOf,
} from '@kernels/application';
import {
  type SourceDomainError,
  type SourceSyncJobDomainError,
} from '@contexts/sources/domain';

type UploadSourceFailureDetails = {
  readonly causeCode?: string;
};

export type UploadSourceFingerprintUnavailableError = ApplicationErrorOf<
  typeof APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
  'upload_source',
  'fingerprint_unavailable',
  UploadSourceFailureDetails
>;

export type UploadSourceSyncUnavailableError = ApplicationErrorOf<
  typeof APPLICATION_ERROR_KIND.DEPENDENCY_UNAVAILABLE,
  'upload_source',
  'source_sync_unavailable',
  UploadSourceFailureDetails
>;

export type UploadSourceSyncStateConflictError = ApplicationErrorOf<
  typeof APPLICATION_ERROR_KIND.STATE_CONFLICT,
  'upload_source',
  'source_sync_state_conflict',
  UploadSourceFailureDetails
>;

export type UploadSourceSyncError =
  | UploadSourceSyncUnavailableError
  | UploadSourceSyncStateConflictError;

export type UploadSourceDomainError =
  | SourceDomainError
  | SourceSyncJobDomainError;

export type UploadSourceApplicationError =
  | UploadSourceFingerprintUnavailableError
  | UploadSourceSyncError;

export type UploadSourceUseCaseError =
  | UploadSourceDomainError
  | UploadSourceApplicationError;
