import { DOMAIN_ERROR_KIND, type DomainErrorOf } from '@kernels/domain';

type SourceFingerprintEmptyError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'source',
  'fingerprint_empty'
>;

export type SourceFingerprintDomainError = SourceFingerprintEmptyError;
