import {
  type SourceFingerprinterError,
  type SourceRepositoryError,
  type SourceSyncJobRepositoryError,
} from '@contexts/sources/application/ports';

export type UploadSourcePortError =
  | SourceFingerprinterError
  | SourceRepositoryError
  | SourceSyncJobRepositoryError;

export type UploadSourceUseCaseError = UploadSourcePortError;
