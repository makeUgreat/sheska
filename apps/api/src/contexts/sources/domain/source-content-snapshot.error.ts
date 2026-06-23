import { DOMAIN_ERROR_KIND, type DomainErrorOf } from '@kernels/domain';
import { type SourceContentHashDomainError } from './source-content-hash.error';
import { type SourceSizeDomainError } from './source-size.error';

type SourceContentSnapshotSizeMismatchError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'source',
  'size_mismatch'
>;

export type SourceContentSnapshotDomainError =
  | SourceContentHashDomainError
  | SourceSizeDomainError
  | SourceContentSnapshotSizeMismatchError;
