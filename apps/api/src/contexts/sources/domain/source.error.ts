import { type EntityDomainError } from '@kernels/domain';
import { type ExternalSourceIdDomainError } from './external-source-id.error';
import { type SourceContentSnapshotDomainError } from './source-content-snapshot.error';

export type SourceValidationError = SourceContentSnapshotDomainError;

export type SourceDomainError =
  | ExternalSourceIdDomainError
  | SourceContentSnapshotDomainError
  | EntityDomainError;
