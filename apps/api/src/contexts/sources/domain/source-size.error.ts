import { DOMAIN_ERROR_KIND, type DomainErrorOf } from '@kernels/domain';

type SourceSizeInvalidError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'source',
  'size_invalid'
>;

export type SourceSizeDomainError = SourceSizeInvalidError;
