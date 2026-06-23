import { DOMAIN_ERROR_KIND, type DomainErrorOf } from '@kernels/domain';

type ExternalSourceIdEmptyError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'external_source',
  'id_empty'
>;

export type ExternalSourceIdDomainError = ExternalSourceIdEmptyError;
