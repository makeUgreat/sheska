import {
  DOMAIN_ERROR_KIND,
  type DomainErrorOf,
  type EntityDomainError,
} from '@kernels/domain';
import { type SourceContentHashDomainError } from './source-content-hash.error';

type SourceSyncJobSourceIdEmptyError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'source_sync_job',
  'source_id_empty'
>;

export type SourceSyncJobValidationError = SourceSyncJobSourceIdEmptyError;

export type SourceSyncJobDomainError =
  | SourceContentHashDomainError
  | SourceSyncJobValidationError
  | EntityDomainError;
