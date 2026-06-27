import {
  DOMAIN_ERROR_KIND,
  type DomainErrorOf,
  type EntityDomainError,
} from '@kernels/domain';
import { type SourceFingerprintDomainError } from './source-fingerprint.error';

type SourceSyncJobSourceIdEmptyError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'source_sync_job',
  'source_id_empty'
>;

type SourceSyncJobStatusInvalidError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'source_sync_job',
  'status_invalid'
>;

export type SourceSyncJobValidationError =
  | SourceSyncJobSourceIdEmptyError
  | SourceSyncJobStatusInvalidError;

export type SourceSyncJobDomainError =
  | SourceFingerprintDomainError
  | SourceSyncJobValidationError
  | EntityDomainError;
