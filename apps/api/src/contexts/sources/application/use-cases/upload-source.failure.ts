import {
  type SourceFingerprinterFailure,
  type SourceRepositoryFailure,
  type SourceSyncJobRepositoryFailure,
} from '@contexts/sources/application/ports';

export type UploadSourcePortFailure =
  | SourceFingerprinterFailure
  | SourceRepositoryFailure
  | SourceSyncJobRepositoryFailure;

export type UploadSourceUseCaseFailure = UploadSourcePortFailure;
