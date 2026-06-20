import { DOMAIN_ERROR_KIND, type DomainErrorOf } from './error.base';

export type EntityDomainError = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'entity',
  'props_not_object'
>;
