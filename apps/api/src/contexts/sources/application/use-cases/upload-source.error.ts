import {
  type SourceDomainError,
  type SourceSyncJobDomainError,
} from '@contexts/sources/domain';
import {
  type SourceFingerprinterError,
  type SourceRepositoryError,
  type SourceSyncJobRepositoryError,
} from '@contexts/sources/application/ports';

export type UploadSourceDomainError =
  | SourceDomainError
  | SourceSyncJobDomainError;

export type UploadSourcePortError =
  | SourceFingerprinterError
  | SourceRepositoryError
  | SourceSyncJobRepositoryError;

export type UploadSourceUseCaseError =
  | UploadSourceDomainError
  | UploadSourcePortError;
